import { randomBytes } from "node:crypto";
import {
  type Browser,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";
import postgres, { type TransactionSql } from "postgres";
import { accederAMotul } from "./acceder";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S1-S6 de `reportes-ux`, contra la aplicación construida y Postgres real:
 * las pestañas por estado con su conteo, el interruptor de atrasados que
 * funciona sin JavaScript, los filtros plegados en el teléfono con la
 * primera fila sobre la barra inferior, y una fila de escritorio donde dónde
 * ocurrió y el atraso caben en el mismo renglón.
 *
 * Los otros estados y el atraso se siembran por SQL: el alta no permite
 * capturarlos, y lo que este spec mide es la bandeja, no el alta.
 */

type Sembrado = {
  /** El reporte del escenario: `RECIBIDO`, capturado por calle. */
  conCalle: string;
  /** `RECIBIDO` y envejecido: el único atrasado de la corrida. */
  atrasado: string;
  enAtencion: string;
  resuelto: string;
};

const DIAS_TRANSCURRIDOS = 40;

let escenario: Scenario;
let sembrado: Sembrado;

const app = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");
  return postgres(url, { max: 1 });
};

// Corto a proposito: el folio real mide quince caracteres, y uno largo haria
// que el renglon del telefono se partiera por el ancho de la cadena.
const folioNuevo = (marca: string, nombre: string) => `REP-${marca}-${nombre}`;

const insertarReporte = (
  tx: TransactionSql,
  opciones: {
    folio: string;
    lugarId: string;
    estado: string;
    area: string | null;
    usuarioId: string;
    /** Cuántos días atrás se registró: es lo que lo vuelve atrasado. */
    diasDeAntiguedad?: number;
  },
) =>
  tx`
    INSERT INTO reportes (ayuntamiento_id, folio, anio, consecutivo, tipo, estado,
                          area_responsable, lugar_id, descripcion,
                          registrado_por_usuario_id, registrado_en)
    VALUES (
      ${MUNICIPIOS.motul.id}, ${opciones.folio}, 2026,
      (SELECT COALESCE(MAX(consecutivo), 0) + 1 FROM reportes WHERE anio = 2026),
      'BACHE', ${opciones.estado}, ${opciones.area}, ${opciones.lugarId},
      'Reporte de la bandeja', ${opciones.usuarioId},
      now() - ${opciones.diasDeAntiguedad ?? 0} * interval '1 day'
    )
  `;

const sembrarBandeja = async (): Promise<Sembrado> => {
  const marca = randomBytes(3).toString("hex").toUpperCase();
  const conexion = await app();

  try {
    return await conexion.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      const [usuario] = await tx<{ id: string }[]>`
        SELECT id FROM usuarios WHERE email = 'tesoreria@example.com' LIMIT 1
      `;
      const usuarioId = usuario?.id ?? "";

      await insertarReporte(tx, {
        folio: folioNuevo(marca, "ATRASADO"),
        lugarId: escenario.vacioId,
        estado: "RECIBIDO",
        area: null,
        usuarioId,
        diasDeAntiguedad: DIAS_TRANSCURRIDOS,
      });
      await insertarReporte(tx, {
        folio: folioNuevo(marca, "ATENCION"),
        lugarId: escenario.vacioId,
        estado: "EN_ATENCION",
        area: "ALUMBRADO_PUBLICO",
        usuarioId,
      });
      await insertarReporte(tx, {
        folio: folioNuevo(marca, "RESUELTO"),
        lugarId: escenario.vacioId,
        estado: "RESUELTO",
        area: null,
        usuarioId,
      });

      return {
        conCalle: escenario.folio,
        atrasado: folioNuevo(marca, "ATRASADO"),
        enAtencion: folioNuevo(marca, "ATENCION"),
        resuelto: folioNuevo(marca, "RESUELTO"),
      };
    });
  } finally {
    await conexion.end();
  }
};

test.beforeAll(async () => {
  await liberarVentanaDeRitmo();
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
  sembrado = await sembrarBandeja();
});

test.beforeEach(liberarVentanaDeRitmo);

const cajaDe = async (locator: Locator) => {
  const caja = await locator.boundingBox();
  if (!caja) throw new Error("El elemento no está en pantalla.");
  return caja;
};

const fila = (page: Page, folio: string) =>
  page.getByRole("link", { name: new RegExp(folio) });

const pestanas = (page: Page) =>
  page.getByRole("navigation", { name: "Estado del reporte" });

const pestana = (page: Page, etiqueta: string) =>
  pestanas(page).getByRole("link", { name: new RegExp(`^${etiqueta}`) });

const interruptor = (page: Page) =>
  page.getByRole("button", { name: /Solo atrasados/ });

test("en escritorio los filtros caben en una fila y la fila dice dónde ocurrió", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(urlDe("motul", "/reportes"));

  const buscar = await cajaDe(page.getByLabel("Buscar reporte"));
  for (const control of [
    page.getByRole("combobox", { name: "Tipo" }),
    page.getByRole("combobox", { name: "Lugar" }),
    page.getByRole("combobox", { name: "Área" }),
    page.getByRole("button", { name: "Filtrar" }),
  ]) {
    expect(Math.abs((await cajaDe(control)).y - buscar.y)).toBeLessThanOrEqual(
      4,
    );
  }
  // El estado dejó de ser un desplegable: vive en las pestañas (S3).
  await expect(page.getByRole("combobox", { name: "Estado" })).toHaveCount(0);

  // Sin «Solo atrasados» la lista trae tambien lo que no esta atrasado: el
  // corte de S1 no se aplica por su cuenta.
  await expect(fila(page, sembrado.enAtencion)).toBeVisible();
  // Y la fila dice donde ocurrio: el lugar y la calle (S4).
  await expect(fila(page, sembrado.conCalle)).toContainText(escenario.reporte);

  const atrasada = fila(page, sembrado.atrasado);
  // Una sola línea: el atraso va dentro de la celda de estado (S6).
  expect((await cajaDe(atrasada)).height).toBeLessThanOrEqual(56);
});

test("las pestañas llevan el estado a la URL y los conteos siguen a los filtros", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", `/reportes?q=${sembrado.enAtencion}`));

  // La búsqueda acota las tres pestañas y el interruptor, no solo la lista.
  await expect(pestana(page, "Recibidos")).toContainText("0");
  await expect(pestana(page, "En atención")).toContainText("1");
  await expect(pestana(page, "Resueltos")).toContainText("0");
  await expect(interruptor(page)).toContainText("0");

  await pestana(page, "En atención").click();
  await expect(page).toHaveURL(/estado=EN_ATENCION/);
  await expect(page).toHaveURL(new RegExp(`q=${sembrado.enAtencion}`));
  await expect(pestana(page, "En atención")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(fila(page, sembrado.enAtencion)).toBeVisible();
  await expect(fila(page, sembrado.resuelto)).toHaveCount(0);

  // Cambiar de pestaña no pierde la búsqueda, y con ella puesta no hay
  // ningún resuelto que coincida.
  await pestana(page, "Resueltos").click();
  await expect(page).toHaveURL(/estado=RESUELTO/);
  await expect(page).toHaveURL(new RegExp(`q=${sembrado.enAtencion}`));
  await expect(pestana(page, "Resueltos")).toContainText("0");
  await expect(fila(page, sembrado.enAtencion)).toHaveCount(0);

  await page.goto(urlDe("motul", `/reportes?q=${sembrado.resuelto}`));
  await expect(pestana(page, "Resueltos")).toContainText("1");
  await expect(pestana(page, "En atención")).toContainText("0");
});

test("«Solo atrasados» se enciende y se apaga sin JavaScript", async ({
  browser,
}) => {
  const contexto = await contextoSinJavaScript(browser);

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/reportes"));

    await interruptor(page).click();
    await expect(page).toHaveURL(/atrasados=1/);
    await expect(fila(page, sembrado.atrasado)).toBeVisible();
    await expect(fila(page, sembrado.enAtencion)).toHaveCount(0);

    await interruptor(page).click();
    await expect(page).not.toHaveURL(/atrasados=1/);
    await expect(fila(page, sembrado.enAtencion)).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("a 390 el pliegue arranca cerrado y la primera fila queda sobre la barra inferior", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(urlDe("motul", "/reportes"));

  const pliegue = page.locator("details").first();
  await expect(pliegue).toHaveJSProperty("open", false);
  await expect(page.getByLabel("Buscar reporte")).toBeHidden();
  // Las pestañas se recorren en horizontal en vez de romper la línea.
  expect(
    await pestanas(page).evaluate((nav) => getComputedStyle(nav).overflowX),
  ).toBe("auto");

  const barra = await cajaDe(
    page.getByRole("navigation", { name: "Navegación principal" }),
  );
  const primera = page
    .getByRole("list", { name: "Reportes ciudadanos" })
    .getByRole("link")
    .first();
  await expect(primera).toBeVisible();
  const cajaPrimera = await cajaDe(primera);
  expect(cajaPrimera.y + cajaPrimera.height).toBeLessThanOrEqual(barra.y);
  expect(cajaPrimera.y + cajaPrimera.height).toBeLessThanOrEqual(844);
});

test("la fila del teléfono lleva folio y estado, tipo y ubicación, y la fecha con su atraso", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(urlDe("motul", "/reportes"));

  const atrasada = fila(page, sembrado.atrasado);
  await atrasada.scrollIntoViewIfNeeded();

  const folio = await cajaDe(atrasada.getByText(sembrado.atrasado).first());
  const estado = await cajaDe(
    atrasada.getByText("Recibido", { exact: true }).first(),
  );
  expect(Math.abs(estado.y - folio.y)).toBeLessThanOrEqual(12);

  // El segundo renglon: el tipo y donde ocurrio, en una sola lectura.
  const tipoYUbicacion = await cajaDe(atrasada.getByText(/^Bache · /));
  expect(tipoYUbicacion.y).toBeGreaterThan(estado.y);

  const atraso = await cajaDe(
    atrasada.getByText(/Atrasado · \d+ días/).first(),
  );
  expect(atraso.y).toBeGreaterThan(tipoYUbicacion.y);
});

/** La sesión se abre con script; lo que se prueba después corre sin él. */
const contextoSinJavaScript = async (browser: Browser) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  return browser.newContext({ javaScriptEnabled: false, storageState: estado });
};
