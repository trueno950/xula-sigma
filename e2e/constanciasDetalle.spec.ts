import { expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import {
  type ConstanciasSembradas,
  sembrarConstancias,
} from "./constanciasFixture";
import { urlDe } from "./municipios";

/**
 * Detalle de una constancia, S7-S9 de `constancias-ux` sobre
 * `design/constancias-detalle/02-hoja-sellada.html`: el estado se lee una
 * sola vez como sello sobre la hoja, el titular enlaza a su ficha y las dos
 * acciones con motivo caben en un acordeon.
 */
let constancias: ConstanciasSembradas;

test.beforeAll(async () => {
  await liberarVentanaDeRitmo();
  constancias = await sembrarConstancias();
});

const detalleDe = (id: string) => urlDe("motul", `/constancias/${id}`);

test("la cabecera titula con el folio y no repite el estado", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(detalleDe(constancias.vigenteId));

  await expect(
    page.getByRole("heading", { level: 1, name: constancias.folioVigente }),
  ).toBeVisible();
  await expect(page.getByText("Constancia de vecindad").first()).toBeVisible();

  // L6: el estado vive en el sello de la hoja y en ningun otro lugar.
  await expect(page.getByText("Vigente", { exact: true })).toHaveCount(1);
  await expect(
    page.locator("article").getByText("Vigente", { exact: true }),
  ).toBeVisible();
});

test("el titular de la hoja enlaza a su ficha en el padron", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(detalleDe(constancias.vigenteId));

  const titular = page.locator("article").getByRole("link", {
    name: /^Titular /,
  });

  await expect(titular).toHaveAttribute("href", /^\/padron\/[0-9a-f-]{36}$/);
});

test("reimprimir y cancelar se pliegan en un acordeon y cancelar queda al final", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(detalleDe(constancias.vigenteId));

  const reimprimir = page.getByText("Reimprimir constancia…");
  const cancelar = page.getByText("Cancelar constancia…");

  await expect(reimprimir).toBeVisible();
  await expect(cancelar).toBeVisible();

  // «Cancelar» va despues de «Reimprimir» en el orden del documento, que es
  // el orden en que lo leen el teclado y el lector de pantalla.
  const pliegues = await page.evaluate(() =>
    [
      ...document.querySelectorAll('details[name="acciones-de-constancia"]'),
    ].map(
      (pliegue) => pliegue.querySelector("summary")?.textContent?.trim() ?? "",
    ),
  );

  expect(pliegues).toEqual(["Reimprimir constancia…", "Cancelar constancia…"]);

  // Y se distingue por color, no solo por texto: el de cancelar usa la
  // senal de error.
  const colorDe = (texto: string) =>
    page.getByText(texto).evaluate((nodo) => getComputedStyle(nodo).color);

  expect(await colorDe("Cancelar constancia…")).not.toBe(
    await colorDe("Reimprimir constancia…"),
  );

  await reimprimir.click();
  await expect(page.getByLabel("Motivo de reimpresión")).toBeVisible();

  await cancelar.click();
  await expect(page.getByLabel("Motivo de cancelación")).toBeVisible();
  await expect(page.getByLabel("Motivo de reimpresión")).toBeHidden();
});

test("una constancia cancelada se sella como cancelada, con su motivo, y no se imprime", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(detalleDe(constancias.canceladaId));

  await expect(page.getByText("Cancelada", { exact: true })).toHaveCount(1);
  await expect(
    page.getByText(/Motivo: Error de captura/).first(),
  ).toBeVisible();
  await expect(
    page.locator("article").getByText(/^Cancelada el /),
  ).toBeVisible();

  await expect(page.getByRole("link", { name: "Imprimir" })).toHaveCount(0);
  await expect(page.getByText("Reimprimir constancia…")).toHaveCount(0);
  await expect(page.getByText("Cancelar constancia…")).toHaveCount(0);

  const nueva = page.getByRole("link", { name: "Emitir una constancia nueva" });
  await expect(nueva).toHaveAttribute(
    "href",
    /^\/constancias\/emitir\?personaId=[0-9a-f-]{36}$/,
  );
});

test("a 390 la hoja, la barra y el historial caben en una columna", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await accederAMotul(page);
  await page.goto(detalleDe(constancias.vigenteId));

  await expect(
    page.getByRole("heading", { level: 1, name: constancias.folioVigente }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Imprimir" })).toBeVisible();
  await expect(page.getByText("Reimprimir constancia…")).toBeVisible();
  await expect(page.getByText("Cancelar constancia…")).toBeVisible();

  const historial = page.getByRole("heading", {
    name: "Historial del documento",
  });
  await expect(historial).toBeVisible();

  // La barra inferior del panel es fija: con la pagina al final, el ultimo
  // renglon del expediente no puede quedar debajo de ella.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const ultimo = page.getByText("Constancia emitida");
  const caja = await ultimo.boundingBox();
  const barra = await page
    .getByRole("navigation", { name: "Navegación principal" })
    .boundingBox();

  expect(caja).not.toBeNull();
  expect(barra).not.toBeNull();
  expect((caja?.y ?? 0) + (caja?.height ?? 0)).toBeLessThan(barra?.y ?? 0);
});
