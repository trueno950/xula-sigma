import { expect, type Locator, type Page, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { urlDe } from "./municipios";

/**
 * S5, S6 y S7 de `padron-ux` contra el alta construida: la linea que nombra
 * los opcionales, las tres piezas del nombre en una fila en escritorio y
 * nada del formulario debajo de la barra inferior en el telefono.
 *
 * Las tres se verifican con cajas medidas por el navegador y no con clases
 * del marcado: la fila es una relacion entre tres cajas, y que la barra no
 * tape nada es que el punto del centro de cada pieza siga siendo suyo.
 */

const LINEA_DE_OBLIGATORIOS =
  "Todos los campos son obligatorios, salvo el segundo apellido y la CURP.";

const cajaDe = async (locator: Locator) => {
  const caja = await locator.boundingBox();
  if (!caja) throw new Error("El elemento no está en pantalla.");
  return caja;
};

const barraInferior = (page: Page) =>
  page.getByRole("navigation", { name: "Navegación principal" });

const abrirAlta = async (page: Page): Promise<void> => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/padron/alta"));
  await expect(
    page.getByRole("heading", { name: "Nueva persona" }),
  ).toBeVisible();
};

/** `true` si en el centro del elemento hay otra cosa encima. */
const estaTapado = (locator: Locator) =>
  locator.evaluate((elemento) => {
    const caja = elemento.getBoundingClientRect();
    const encima = document.elementFromPoint(
      caja.x + caja.width / 2,
      caja.y + caja.height / 2,
    );
    return !(encima === elemento || elemento.contains(encima));
  });

const noLaTapaLaBarra = async (page: Page, pieza: Locator): Promise<void> => {
  await pieza.scrollIntoViewIfNeeded();

  const [caja, barra] = await Promise.all([
    cajaDe(pieza),
    cajaDe(barraInferior(page)),
  ]);

  expect(caja.y + caja.height).toBeLessThanOrEqual(barra.y);
  expect(await estaTapado(pieza)).toBe(false);
};

test("el alta dice en una línea qué campos son opcionales", async ({
  page,
}) => {
  await abrirAlta(page);

  await expect(page.getByText(LINEA_DE_OBLIGATORIOS)).toBeVisible();
});

test("en el teléfono la barra inferior no tapa Guardar ni las ayudas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirAlta(page);

  await noLaTapaLaBarra(page, page.getByRole("button", { name: "Guardar" }));
  await noLaTapaLaBarra(
    page,
    page.getByText("Dejar vacío si la persona no lo usa."),
  );
  await noLaTapaLaBarra(
    page,
    page.getByText("18 caracteres. Se puede completar después."),
  );
});

test("en escritorio los tres nombres van en una fila y la CURP con ellos", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrirAlta(page);

  const nombres = await cajaDe(page.getByLabel("Nombres"));
  const primero = await cajaDe(page.getByLabel("Primer apellido"));
  const segundo = await cajaDe(page.getByLabel("Segundo apellido"));

  expect(primero.y).toBeCloseTo(nombres.y, 0);
  expect(segundo.y).toBeCloseTo(nombres.y, 0);
  expect(nombres.x).toBeLessThan(primero.x);
  expect(primero.x).toBeLessThan(segundo.x);

  const persona = page.getByRole("group", { name: "Datos de la persona" });
  await expect(persona.getByLabel("CURP")).toBeVisible();
  await expect(page.getByRole("group", { name: "Identificación" })).toHaveCount(
    0,
  );
});
