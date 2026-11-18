import { randomBytes } from "node:crypto";
import { expect, type Locator, type Page, test } from "@playwright/test";
import postgres, { type TransactionSql } from "postgres";
import { accederAMotul } from "./acceder";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S1-S4 de `padron-ux` en el listado: el domicilio vigente de cada persona,
 * la CURP con su lectura, la linea de resultado con la busqueda y el pie, y
 * -en el telefono- el buscador antes que «Nueva persona» con cada fila
 * tocable.
 *
 * Se siembra a mano porque el escenario necesita a la vez una persona con
 * residencia y CURP, y otra sin ninguna de las dos: el listado tiene que
 * distinguirlas en la misma pantalla.
 */
type Escenario = {
  /** Prefijo unico de esta corrida; es tambien lo que se busca. */
  marca: string;
  /** Apellidos: la marca delante para que la busqueda sea prefijo de palabra. */
  primero: string;
  segundo: string;
  conDomicilio: { curp: string };
  via: string;
  lugar: string;
};

let escenario: Escenario;

const conBase = async <T>(
  consulta: (tx: TransactionSql) => Promise<T>,
): Promise<Awaited<T>> => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E del listado.");

  const app = postgres(url, { max: 1 });
  try {
    return (await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      return consulta(tx);
    })) as Awaited<T>;
  } finally {
    await app.end();
  }
};

const insertarPersona = async (
  tx: TransactionSql,
  nombres: string,
  primerApellido: string,
  curp: string | null,
): Promise<string> => {
  const [fila] = await tx<{ id: string }[]>`
    INSERT INTO personas (ayuntamiento_id, nombres, primer_apellido, curp, nombre_normalizado)
    VALUES (
      ${MUNICIPIOS.motul.id}, ${nombres}, ${primerApellido}, ${curp},
      ${`${nombres} ${primerApellido}`.toLowerCase()}
    )
    RETURNING id
  `;
  if (!fila) throw new Error("No se pudo sembrar la persona.");
  return fila.id;
};

test.beforeAll(async () => {
  const marca = randomBytes(3).toString("hex");
  // Una CURP por corrida: el seed corre dos veces si el worker se reinicia y
  // `personas_tenant_curp_idx` es unico por municipio.
  const digitos = String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(
    6,
    "0",
  );
  const curp = `AAMG${digitos}MYNXXX01`;

  escenario = await conBase(async (tx) => {
    const [asentamiento] = await tx<{ id: string }[]>`
      INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
      VALUES (${MUNICIPIOS.motul.id}, 'comisaria', ${`Asentamiento listado ${marca}`})
      RETURNING id
    `;
    if (!asentamiento) throw new Error("No se pudo sembrar el asentamiento.");

    const via = `Calle listado ${marca}`;
    const [calle] = await tx<{ id: string }[]>`
      INSERT INTO calles (ayuntamiento_id, lugar_id, nombre)
      VALUES (${MUNICIPIOS.motul.id}, ${asentamiento.id}, ${via})
      RETURNING id
    `;
    if (!calle) throw new Error("No se pudo sembrar la calle.");

    const [domicilio] = await tx<{ id: string }[]>`
      INSERT INTO domicilios (ayuntamiento_id, lugar_id, calle_id, numero)
      VALUES (${MUNICIPIOS.motul.id}, ${asentamiento.id}, ${calle.id}, '114')
      RETURNING id
    `;
    if (!domicilio) throw new Error("No se pudo sembrar el domicilio.");

    const conDomicilioId = await insertarPersona(
      tx,
      `Listado${marca}`,
      `${marca}Aaa`,
      curp,
    );
    await tx`
      INSERT INTO residencias (ayuntamiento_id, persona_id, domicilio_id, desde_en)
      VALUES (${MUNICIPIOS.motul.id}, ${conDomicilioId}, ${domicilio.id}, '2026-01-15')
    `;

    await insertarPersona(tx, `Listado${marca}`, `${marca}Bbb`, null);

    return {
      marca,
      primero: `${marca}Aaa`,
      segundo: `${marca}Bbb`,
      conDomicilio: { curp },
      via: `Calle listado ${marca} #114`,
      lugar: `Asentamiento listado ${marca}`,
    };
  });
});

const abrirListado = async (
  page: Page,
  parametros = `?q=${escenario.marca}`,
): Promise<void> => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", `/padron${parametros}`));
};

const filas = (page: Page) =>
  page.getByRole("link", { name: /Abrir la ficha de/ });

const cajaDe = async (locator: Locator) => {
  const caja = await locator.boundingBox();
  if (!caja) throw new Error("El elemento no está en pantalla.");
  return caja;
};

test("cada fila dice donde vive hoy, y sin residencia dice «Sin domicilio» (S1)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrirListado(page);

  await expect(page.getByText(escenario.via)).toBeVisible();
  await expect(page.getByText(escenario.lugar, { exact: false })).toHaveCount(
    1,
  );
  await expect(page.getByText("Sin domicilio")).toBeVisible();
  await expect(page.getByText("Domicilio vigente")).toBeVisible();
});

test("la CURP se lee bajo su columna y el pendiente lleva su palabra (S2)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrirListado(page);

  await expect(page.getByText(escenario.conDomicilio.curp)).toBeVisible();
  await expect(page.getByText("Sin CURP")).toBeVisible();
});

test("la linea de resultado dice cuantas, que se busco y con que orden (S3)", async ({
  page,
}) => {
  await abrirListado(page);

  await expect(
    page.getByText(new RegExp(`2 personas para «${escenario.marca}»`)),
  ).toBeVisible();
  await expect(page.getByText(/por relevancia/)).toBeVisible();
  await expect(page.getByText("Mostrando 1–2 de 2 personas")).toBeVisible();
});

test("el chip quita la busqueda y el campo conserva lo escrito (S3)", async ({
  page,
}) => {
  await abrirListado(page);

  await expect(page.getByLabel("Buscar persona")).toHaveValue(escenario.marca);
  await page.getByRole("link", { name: /Quitar filtro/ }).click();

  await expect(page).toHaveURL(/\/padron$/);
  await expect(page.getByLabel("Buscar persona")).toHaveValue("");
});

test("una busqueda sin resultados no dice que el padron este vacio (S3)", async ({
  page,
}) => {
  await abrirListado(page, `?q=zzz${escenario.marca}`);

  await expect(page.getByText("Sin resultados para")).toBeVisible();
  await expect(
    page.getByText("Todavía no hay personas en el padrón."),
  ).toHaveCount(0);
  // En el telefono el alta viaja con la lista: la cabecera la esconde.
  await expect(page.getByRole("link", { name: "Nueva persona" })).toBeVisible();
});

test("en el telefono el buscador va antes y cada fila es tocable (S4)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirListado(page);

  const campo = page.getByLabel("Buscar persona");
  const alta = page.getByRole("link", { name: "Nueva persona" });

  await expect(campo).toBeVisible();
  await expect(alta).toBeVisible();

  const buscador = await cajaDe(campo);
  expect(buscador.y).toBeLessThan((await cajaDe(alta)).y);

  const fila = filas(page).first();
  await expect(fila).toBeVisible();

  expect((await cajaDe(fila)).height).toBeGreaterThanOrEqual(44);
  await expect(fila).toHaveAttribute(
    "aria-label",
    new RegExp(`Abrir la ficha de .*${escenario.marca}`),
  );
  await expect(
    page.getByRole("link", { name: new RegExp(escenario.primero) }),
  ).toHaveAttribute("aria-label", /Calle listado/);
});

test("el orden pedido en la URL cambia el primero de la lista", async ({
  page,
}) => {
  await abrirListado(
    page,
    `?q=${escenario.marca}&ordenar=persona&direccion=asc`,
  );
  await expect(filas(page).first()).toHaveAttribute(
    "aria-label",
    new RegExp(escenario.primero),
  );

  await abrirListado(
    page,
    `?q=${escenario.marca}&ordenar=persona&direccion=desc`,
  );
  await expect(filas(page).first()).toHaveAttribute(
    "aria-label",
    new RegExp(escenario.segundo),
  );
});

test("con otra pagina por delante el pie dice lo que muestra y ofrece seguir", async ({
  page,
}) => {
  await abrirListado(page, `?q=${escenario.marca}&limite=1`);

  await expect(page.getByText("Mostrando 1–1 persona")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver más" })).toHaveAttribute(
    "href",
    /limite=51/,
  );
});
