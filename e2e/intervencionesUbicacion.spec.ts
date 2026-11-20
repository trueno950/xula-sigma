import { randomBytes } from "node:crypto";
import { type Browser, expect, type Page, test } from "@playwright/test";
import postgres, { type TransactionSql } from "postgres";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { filaAusente, type IdRow } from "./escenarioSql";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S6 de `intervenciones-ux`: la calle depende del lugar. En el alta de
 * `/intervenciones/alta` solo se ofrecen las calles del asentamiento del lugar
 * elegido, y el servidor rechaza una calle de otro asentamiento con un mensaje
 * para la operadora, sin guardar nada.
 *
 * El escenario es propio y no el de `calles.fixture`: hace falta un segundo
 * asentamiento con calle activa -`destino` de esa fixture la tiene, pero su id
 * no sale del escenario-, y la raiz es `comisaria` porque `calles.spec.ts` ya
 * ocupa la unica cabecera de Motul.
 */
type Escenario = {
  asentamiento: { id: string; nombre: string };
  otroAsentamiento: { id: string; nombre: string };
  calle: { id: string; nombre: string };
  calleAjena: { id: string; nombre: string };
  /** Marca de la corrida: la descripcion que distingue sus altas. */
  marca: string;
};

const abrirConexion = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");

  return postgres(url, { max: 1 });
};

const sembrar = async (): Promise<Escenario> => {
  const marca = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const nombres = {
    asentamiento: `Ubicacion origen ${marca}`,
    otroAsentamiento: `Ubicacion ajena ${marca}`,
    calle: `Calle propia ${marca}`,
    calleAjena: `Calle ajena ${marca}`,
  };
  const app = abrirConexion();

  try {
    return await app.begin(async (tx: TransactionSql) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;

      const crearLugar = async (nombre: string) => {
        const [lugar = { id: filaAusente("lugar") }] = await tx<IdRow[]>`
          INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
          VALUES (${MUNICIPIOS.motul.id}, 'comisaria', ${nombre})
          RETURNING id
        `;
        return lugar.id;
      };
      const crearCalle = async (nombre: string, lugarId: string) => {
        const [calle = { id: filaAusente("calle") }] = await tx<IdRow[]>`
          INSERT INTO calles (ayuntamiento_id, nombre, lugar_id)
          VALUES (${MUNICIPIOS.motul.id}, ${nombre}, ${lugarId})
          RETURNING id
        `;
        return calle.id;
      };

      const asentamientoId = await crearLugar(nombres.asentamiento);
      const otroAsentamientoId = await crearLugar(nombres.otroAsentamiento);

      return {
        asentamiento: { id: asentamientoId, nombre: nombres.asentamiento },
        otroAsentamiento: {
          id: otroAsentamientoId,
          nombre: nombres.otroAsentamiento,
        },
        calle: {
          id: await crearCalle(nombres.calle, asentamientoId),
          nombre: nombres.calle,
        },
        calleAjena: {
          id: await crearCalle(nombres.calleAjena, otroAsentamientoId),
          nombre: nombres.calleAjena,
        },
        marca,
      };
    });
  } finally {
    await app.end();
  }
};

/** Las intervenciones con esa descripcion: la que un alta dejo, o ninguna. */
const intervencionesConLaDescripcion = async (
  descripcion: string,
): Promise<number> => {
  const app = abrirConexion();

  try {
    return await app.begin(async (tx: TransactionSql) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      const [fila = { total: "0" }] = await tx<{ total: string }[]>`
        SELECT count(*)::text AS total
          FROM intervenciones
         WHERE descripcion = ${descripcion}
      `;
      return Number(fila.total);
    });
  } finally {
    await app.end();
  }
};

let escenario: Escenario;

test.beforeAll(async () => {
  escenario = await sembrar();
});

test.beforeEach(liberarVentanaDeRitmo);

const abrirAlta = async (page: Page) => {
  await page.goto(urlDe("motul", "/intervenciones/alta"));
  await expect(
    page.getByRole("heading", { name: "Registrar intervención" }),
  ).toBeVisible();
};

const camposDe = async (
  page: Page,
  campos: { lugarId: string; calleId: string; descripcion: string },
) => {
  await page.getByLabel("Tipo de obra").selectOption("BACHE");
  await page.getByLabel("Lugar", { exact: true }).selectOption(campos.lugarId);
  await page.getByLabel("Calle (opcional)").selectOption(campos.calleId);
  await page.getByLabel("Fecha de ocurrencia").fill("2026-11-20");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill(campos.descripcion);
};

const contextoSinJavaScript = async (browser: Browser) => {
  const conSesion = await browser.newContext();
  await accederAMotul(await conSesion.newPage());
  const estado = await conSesion.storageState();
  await conSesion.close();

  return browser.newContext({
    javaScriptEnabled: false,
    storageState: estado,
  });
};

test("con JavaScript, la calle solo ofrece las del asentamiento del lugar elegido", async ({
  page,
}) => {
  await accederAMotul(page);
  await abrirAlta(page);

  const calle = page.getByLabel("Calle (opcional)");

  // Sin lugar elegido van todas, agrupadas por asentamiento: es lo que ve
  // quien todavia no eligio y lo que queda sin JavaScript.
  await expect(calle.locator("optgroup").first()).toBeAttached();
  await expect(
    calle.getByRole("option", { name: escenario.calleAjena.nombre }),
  ).toHaveCount(1);

  await page
    .getByLabel("Lugar", { exact: true })
    .selectOption(escenario.asentamiento.id);

  await expect(calle.locator("optgroup")).toHaveCount(0);
  await expect(
    calle.getByRole("option", { name: escenario.calleAjena.nombre }),
  ).toHaveCount(0);
  await expect(
    calle.getByRole("option", { name: escenario.calle.nombre }),
  ).toHaveCount(1);

  // Cambiar de asentamiento descarta la calle elegida antes: seguiria viajando
  // una calle que ya no es de este lugar.
  await page
    .getByLabel("Lugar", { exact: true })
    .selectOption(escenario.otroAsentamiento.id);
  await expect(calle).toHaveValue("");
  await expect(
    calle.getByRole("option", { name: escenario.calleAjena.nombre }),
  ).toHaveCount(1);
});

test("sin JavaScript, una calle de otro asentamiento se rechaza y no guarda nada", async ({
  browser,
}) => {
  const descripcion = `Calle de otro asentamiento ${escenario.marca}`;
  const contexto = await contextoSinJavaScript(browser);
  const page = await contexto.newPage();

  try {
    await abrirAlta(page);
    await camposDe(page, {
      lugarId: escenario.asentamiento.id,
      calleId: escenario.calleAjena.id,
      descripcion,
    });
    await page.getByRole("button", { name: "Registrar intervención" }).click();

    // El rechazo vuelve con lo capturado (S8 de `intervenciones-ux`): la URL
    // lleva el token del borrador y el mensaje, nunca la descripcion.
    await expect(page).toHaveURL(
      /\/intervenciones\/alta\?borrador=[0-9a-f-]{36}&error=/,
    );
    expect(page.url()).not.toContain(encodeURIComponent(descripcion));
    await expect(
      page.getByText(
        "La calle elegida no es de ese lugar. Elija una calle del lugar, o registre la intervención sin calle.",
      ),
    ).toBeVisible();
    expect(await intervencionesConLaDescripcion(descripcion)).toBe(0);
  } finally {
    await contexto.close();
  }
});

test("sin JavaScript, la calle del asentamiento elegido sigue registrando la intervencion", async ({
  browser,
}) => {
  const descripcion = `Calle del mismo asentamiento ${escenario.marca}`;
  const contexto = await contextoSinJavaScript(browser);
  const page = await contexto.newPage();

  try {
    await abrirAlta(page);
    await camposDe(page, {
      lugarId: escenario.asentamiento.id,
      calleId: escenario.calle.id,
      descripcion,
    });
    await page.getByRole("button", { name: "Registrar intervención" }).click();

    await expect(page).toHaveURL(/\/intervenciones\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { name: "Intervención Bache" }),
    ).toBeVisible();
    expect(await intervencionesConLaDescripcion(descripcion)).toBe(1);
  } finally {
    await contexto.close();
  }
});
