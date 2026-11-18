import { expect, type Page, test } from "@playwright/test";
import postgres from "postgres";
import { accederAMotul } from "./acceder";
import {
  type ConstanciasSembradas,
  sembrarConstancias,
} from "./constanciasFixture";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S1-S3 de `constancias-ux` en el listado. Se reusa `sembrarConstancias`
 * -la siembra de `constanciaCancelada`- porque ya trae una vigente y una
 * cancelada del mismo titular, que es lo que este listado tiene que
 * distinguir en la misma pantalla.
 */
type Escenario = ConstanciasSembradas & {
  /** El nombre congelado en el snapshot de emisión; es lo que busca S2. */
  titular: string;
  /** El prefijo único de esta corrida, dentro de `titular`. */
  marca: string;
};

let escenario: Escenario;

const TITULAR = /^Titular ([0-9a-f]{6}) Prueba$/;

const conBase = async <T>(
  consulta: (tx: postgres.TransactionSql) => Promise<T>,
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

const titularDe = async (constanciaId: string): Promise<string> => {
  const [fila] = await conBase(
    (tx) =>
      tx<{ nombre: string }[]>`
      SELECT datos -> 'titular' ->> 'nombreCompleto' AS nombre
      FROM constancias
      WHERE id = ${constanciaId}
    `,
  );

  if (!fila) throw new Error("No se encontró el titular sembrado.");
  return fila.nombre;
};

test.beforeAll(async () => {
  const sembradas = await sembrarConstancias();
  const titular = await titularDe(sembradas.vigenteId);
  const marca = TITULAR.exec(titular)?.[1];

  if (!marca) throw new Error(`Titular inesperado: ${titular}`);
  escenario = { ...sembradas, titular, marca };
});

const abrirListado = async (page: Page, parametros = ""): Promise<void> => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", `/constancias${parametros}`));
};

const filas = (page: Page) =>
  page.getByRole("link", { name: /Abrir la constancia/ });

test("cada fila dice a quién se le emitió, no solo el folio (S1)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrirListado(page, `?q=${escenario.marca}`);

  await expect(page.getByText("Titular", { exact: true })).toBeVisible();
  await expect(page.getByText(escenario.titular).first()).toBeVisible();
  await expect(filas(page).first()).toHaveAttribute(
    "aria-label",
    new RegExp(`Abrir la constancia ${escenario.folioVigente} de`),
  );
});

test("el buscador dice qué busca y el conteo nombra la búsqueda (S2)", async ({
  page,
}) => {
  await abrirListado(page);

  await expect(
    page.getByLabel("Buscar constancia", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Por folio (VEC-2026-000018) o por el nombre del titular. No distingue acentos ni mayúsculas.",
    ),
  ).toBeVisible();

  await page
    .getByLabel("Buscar constancia", { exact: true })
    .fill(escenario.folioVigente);
  await page.getByRole("button", { name: "Buscar" }).click();

  await expect(
    page.getByText(`1 constancia para «${escenario.folioVigente}»`),
  ).toBeVisible();
  await expect(page.getByText("Mostrando 1–1 de 1 constancia")).toBeVisible();
});

test("la búsqueda por el nombre del titular encuentra su constancia (S2)", async ({
  page,
}) => {
  await abrirListado(page, `?q=${escenario.marca}`);

  await expect(
    page.getByText(new RegExp(`constancias para «${escenario.marca}»`)),
  ).toBeVisible();
  await expect(page.getByText(escenario.titular).first()).toBeVisible();
});

test("el chip de la búsqueda la quita y deja el listado completo (S2)", async ({
  page,
}) => {
  await abrirListado(page, `?q=${escenario.marca}&estado=VIGENTE`);

  await expect(page.getByText("Quitar filtro: Estado: Vigente")).toBeVisible();
  await page
    .getByRole("link", { name: `Quitar filtro: ${escenario.marca}` })
    .click();

  await expect(page).toHaveURL(/\/constancias\?estado=VIGENTE$/);
});

test("una búsqueda sin resultados la nombra y ofrece quitarla (S2)", async ({
  page,
}) => {
  await abrirListado(page, `?q=zzz${escenario.marca}`);

  await expect(page.getByText("Sin resultados para")).toBeVisible();
  await expect(
    page.getByText("Todavía no hay constancias emitidas."),
  ).toHaveCount(0);

  await page.getByRole("link", { name: "Quitar búsqueda" }).click();
  await expect(page).toHaveURL(/\/constancias$/);
});

test("la cabecera ofrece emitir y el bloque de firma (S3)", async ({
  page,
}) => {
  await abrirListado(page);

  const emitir = page.getByRole("link", { name: "Emitir constancia" });
  await expect(emitir).toBeVisible();
  await expect(emitir).toHaveAttribute("href", /\/constancias\/emitir$/);
  await expect(
    page.getByRole("link", { name: "Bloque de firma" }),
  ).toHaveAttribute("href", /\/constancias\/configuracion$/);

  await emitir.click();
  await expect(page).toHaveURL(/\/constancias\/emitir$/);
});

test("en el teléfono cada constancia es tocable y lleva tres renglones (S1)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirListado(page, `?q=${escenario.marca}`);

  const fila = filas(page).first();
  const caja = await fila.boundingBox();
  if (!caja) throw new Error("La fila no está en pantalla.");
  expect(caja.height).toBeGreaterThanOrEqual(44);
  await expect(fila).toHaveAttribute(
    "aria-label",
    new RegExp(`Abrir la constancia .* de ${escenario.titular},`),
  );
});

test("el filtro de estado y la paginación siguen vivos en la URL", async ({
  page,
}) => {
  await abrirListado(page, `?q=${escenario.marca}&estado=CANCELADA`);

  for (const fila of await filas(page).all()) {
    await expect(fila).toHaveAttribute("aria-label", /, Cancelada$/);
  }

  await abrirListado(page, `?q=${escenario.marca}&limite=1`);

  await expect(page.getByText("Mostrando 1–1 constancia")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver más" })).toHaveAttribute(
    "href",
    /limite=51/,
  );
});
