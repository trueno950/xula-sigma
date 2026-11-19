import { randomBytes } from "node:crypto";
import { expect, type Locator, type Page, test } from "@playwright/test";
import postgres, { type TransactionSql } from "postgres";
import { accederAMotul } from "./acceder";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S9 y S10 de `territorio-ux` en el registro plano: una sola busqueda con
 * pista en vez de tres cajas, y la linea de conteo con el total del
 * municipio. S14 en lo que toca a esta pantalla: el `<form>` sigue siendo un
 * GET nativo -funciona sin JavaScript- y la fila sigue abriendo el panel del
 * domicilio.
 */
type Escenario = {
  marca: string;
  asentamiento: string;
  calle: string;
  /** Las dos calles, para distinguir la que se busca de la que no. */
  otraCalle: string;
};

let escenario: Escenario;

const conBase = async <T>(
  consulta: (tx: TransactionSql) => Promise<T>,
): Promise<Awaited<T>> => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E del registro.");

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

const insertarCalle = async (
  tx: TransactionSql,
  lugarId: string,
  nombre: string,
): Promise<string> => {
  const [calle] = await tx<{ id: string }[]>`
    INSERT INTO calles (ayuntamiento_id, lugar_id, nombre)
    VALUES (${MUNICIPIOS.motul.id}, ${lugarId}, ${nombre})
    RETURNING id
  `;
  if (!calle) throw new Error("No se pudo sembrar la calle.");
  return calle.id;
};

const insertarDomicilio = async (
  tx: TransactionSql,
  lugarId: string,
  calleId: string,
  numero: string,
): Promise<void> => {
  await tx`
    INSERT INTO domicilios (ayuntamiento_id, lugar_id, calle_id, numero)
    VALUES (${MUNICIPIOS.motul.id}, ${lugarId}, ${calleId}, ${numero})
  `;
};

test.beforeAll(async () => {
  const marca = randomBytes(3).toString("hex");

  escenario = await conBase(async (tx) => {
    const asentamiento = `Asentamiento registro ${marca}`;
    const [lugar] = await tx<{ id: string }[]>`
      INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
      VALUES (${MUNICIPIOS.motul.id}, 'comisaria', ${asentamiento})
      RETURNING id
    `;
    if (!lugar) throw new Error("No se pudo sembrar el asentamiento.");

    const calle = `Calle registro ${marca}`;
    const otraCalle = `Calle registro extra ${marca}`;
    const calleId = await insertarCalle(tx, lugar.id, calle);
    const otraCalleId = await insertarCalle(tx, lugar.id, otraCalle);
    await insertarDomicilio(tx, lugar.id, calleId, "101");
    await insertarDomicilio(tx, lugar.id, calleId, "103");
    await insertarDomicilio(tx, lugar.id, otraCalleId, "7");

    return { marca, asentamiento, calle, otraCalle };
  });
});

const abrirRegistro = async (page: Page, consulta = ""): Promise<void> => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", `/territorio/domicilios${consulta}`));
};

const cajaDe = async (locator: Locator) => {
  const caja = await locator.boundingBox();
  if (!caja) throw new Error("El elemento no está en pantalla.");
  return caja;
};

const buscar = async (page: Page, texto: string): Promise<void> => {
  await page.getByLabel("Calle y número", { exact: true }).fill(texto);
  await page.getByRole("button", { name: "Buscar" }).click();
};

test("una sola busqueda encuentra el domicilio y dice cuantas coinciden y cuantas hay (S9, S10)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrirRegistro(page);

  await expect(
    page.getByText(/Escriba la calle y, si la sabe, el número seguido/),
  ).toBeVisible();
  await expect(page.getByLabel("Número", { exact: true })).toHaveCount(0);

  // La calle y el numero de corrido: la busqueda reparte el texto sola.
  await buscar(page, `${escenario.calle} 101`);

  await expect(page).toHaveURL(/q=Calle\+registro/);
  await expect(
    page.getByText(
      new RegExp(`1 de \\d+ domicilios para «${escenario.calle} 101»`),
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/por asentamiento, calle y número/),
  ).toBeVisible();
  await expect(page.getByText(/Mostrando 1–1 de 1 domicilio/)).toBeVisible();

  const fila = page.getByRole("link", {
    name: `${escenario.calle} #101, ${escenario.asentamiento}`,
  });
  await expect(fila).toBeVisible();
  await expect(fila).toHaveAttribute(
    "href",
    /\/territorio\?raiz=.+&nodo=.+&vista=domicilios&domicilio=/,
  );
  await expect(fila).toContainText(escenario.asentamiento);
});

test("el chip quita la busqueda y la linea vuelve al total del municipio (S10)", async ({
  page,
}) => {
  await abrirRegistro(page, `?q=${escenario.calle}`);

  await expect(
    page.getByText(new RegExp(`domicilios para «${escenario.calle}»`)),
  ).toBeVisible();

  await page
    .getByRole("link", { name: `Quitar filtro: Búsqueda: ${escenario.calle}` })
    .click();

  await expect(page).toHaveURL(/\/territorio\/domicilios$/);
  await expect(page.getByText(/domicilios registrados/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Quitar filtro/ })).toHaveCount(
    0,
  );
});

test("una busqueda sin resultados no dice que el municipio no tenga domicilios (S10)", async ({
  page,
}) => {
  await abrirRegistro(page, `?q=zzz${escenario.marca}`);

  await expect(page.getByText("Sin resultados para")).toBeVisible();
  await expect(page.getByText(/0 de \d+ domicilios/)).toBeVisible();
  await expect(
    page.getByText("Todavía no hay domicilios registrados."),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Quitar el filtro" }),
  ).toBeVisible();
});

test("en el telefono antes del primer domicilio solo hay buscador y «Filtros» (S9)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirRegistro(page, `?q=${escenario.calle}`);

  const filtros = page.getByText("Filtros", { exact: false }).first();
  const primeraFila = page
    .getByRole("link", { name: new RegExp(`${escenario.calle} #`) })
    .first();

  await expect(
    page.getByLabel("Calle y número", { exact: true }),
  ).toBeVisible();
  await expect(filtros).toBeVisible();
  // El asentamiento vive dentro del pliegue: cerrado, no ocupa la pantalla.
  await expect(page.getByLabel("Asentamiento", { exact: true })).toBeHidden();

  expect((await cajaDe(filtros)).y).toBeLessThan((await cajaDe(primeraFila)).y);
  expect((await cajaDe(primeraFila)).height).toBeGreaterThanOrEqual(44);

  await filtros.click();
  await page.getByLabel("Asentamiento", { exact: true }).selectOption({
    label: `${escenario.asentamiento} (comisaría)`,
  });
  await page.getByRole("button", { name: "Buscar" }).click();

  await expect(
    page.getByRole("link", {
      name: `Quitar filtro: Asentamiento: ${escenario.asentamiento} (comisaría)`,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Filtros", { exact: false }).first(),
  ).toContainText("(1)");
});

test("sin JavaScript el registro sigue buscando por GET nativo (S14)", async ({
  browser,
}) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  const contexto = await browser.newContext({
    javaScriptEnabled: false,
    storageState: estado,
  });

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/territorio/domicilios"));

    await buscar(page, `${escenario.calle} 103`);

    await expect(page).toHaveURL(/q=Calle\+registro/);
    await expect(
      page.getByRole("link", {
        name: `${escenario.calle} #103, ${escenario.asentamiento}`,
      }),
    ).toBeVisible();
    await expect(page.getByText(/1 de \d+ domicilios/)).toBeVisible();
  } finally {
    await contexto.close();
  }
});
