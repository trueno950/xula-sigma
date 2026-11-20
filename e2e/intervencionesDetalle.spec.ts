import { expect, type Page, test } from "@playwright/test";
import { fechaCivilCorta, hoyEnMerida } from "@/shared/lib/fecha";
import { accederAMotul } from "./acceder";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * S10-S15 de `intervenciones-ux`, contra la aplicacion construida y Postgres
 * real. El artboard es `design/intervenciones-detalle/01-ficha-historial-y-acciones.html`.
 *
 * El sujeto es lo que la operadora ve y hace: el identificador en el titulo,
 * la insignia de la bandeja, la ficha separada del registro del sistema, el
 * historial que deja una correccion, el paso siguiente como unica primaria y
 * la cancelacion plegada al final con su casilla.
 */
let escenario: Scenario;

test.beforeAll(async () => {
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
});

test.beforeEach(liberarVentanaDeRitmo);

const registrarConCalle = async (page: Page, descripcion: string) => {
  await page.goto(urlDe("motul", "/intervenciones/alta"));
  await page.getByLabel("Tipo de obra").selectOption("PAVIMENTACION");
  await page
    .getByLabel("Lugar", { exact: true })
    .selectOption(escenario.origenId);
  await page.getByLabel("Calle (opcional)").selectOption(escenario.movibleId);
  await page.getByLabel("Fecha de ocurrencia").fill("2026-11-16");
  await page.getByLabel("Descripción", { exact: true }).fill(descripcion);
  await page.getByRole("button", { name: "Registrar intervención" }).click();

  await expect(page).toHaveURL(/\/intervenciones\/[0-9a-f-]{36}$/);
};

test("el detalle lleva identificador, insignia y el historial de la correccion", async ({
  page,
}) => {
  await accederAMotul(page);
  await registrarConCalle(
    page,
    "Pavimentacion de la calle 20 entre 15 y 17 con concreto",
  );

  // S10: el titulo es el identificador, no el tipo, y el estado va como
  // insignia con la misma palabra que la bandeja.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^INT-/);
  await expect(page.getByText("Planificada", { exact: true })).toBeVisible();

  // S14: el hecho y el registro del sistema, con las fechas en un solo formato.
  await expect(page.getByRole("heading", { name: "El hecho" })).toBeVisible();
  await expect(
    page.getByText("Registro del sistema · no es un dato de la obra"),
  ).toBeVisible();
  await expect(page.getByText("16 nov 2026", { exact: true })).toBeVisible();
  // El momento de captura es hoy: se afirma el formato, no un dia fijo. Una
  // intervencion recien registrada tiene la misma captura y actualizacion, y
  // las dos filas casan; cualquiera sirve para probar el formato.
  const hoy = fechaCivilCorta(hoyEnMerida());
  await expect(
    page.getByText(new RegExp(`^${hoy}, \\d{1,2}:\\d{2} [ap]\\.m\\.$`)).first(),
  ).toBeVisible();
  await expect(page.getByText("2026-11-16")).toHaveCount(0);

  // S15: el lugar es un enlace, y con calle se ofrecen historial y mapa.
  // El origen del escenario es una raiz, asi que su enlace es `?raiz=` y no
  // `?raiz=…&nodo=…`.
  await expect(
    page.locator(`a[href="/territorio?raiz=${escenario.origenId}"]`),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver historial de la calle" }),
  ).toHaveAttribute("href", `/calles/${escenario.movibleId}/historial`);
  await expect(
    page.getByRole("link", { name: "Ver en el mapa" }),
  ).toHaveAttribute("href", `/mapa-operativo?lugar=${escenario.origenId}`);

  // S11: la correccion deja su renglon con el valor anterior citado.
  await page.locator("summary", { hasText: "Corregir intervención" }).click();
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Pavimentacion de la calle 20 con concreto hidraulico");
  await page.getByRole("button", { name: "Guardar corrección" }).click();

  await expect(
    page.getByRole("heading", { name: "Historial de cambios" }),
  ).toBeVisible();
  await expect(page.getByText("Descripción corregida")).toBeVisible();
  await expect(
    page.getByText(
      "Antes decía «Pavimentacion de la calle 20 entre 15 y 17 con concreto».",
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/Administrador · \d{1,2} .*nov 2026/),
  ).toBeVisible();
});

test("las acciones tienen jerarquia y cancelar pide confirmacion", async ({
  page,
}) => {
  await accederAMotul(page);
  await registrarConCalle(
    page,
    "Bacheo de la calle 22 frente al parque con mezcla",
  );

  // S12: el siguiente paso es la unica primaria; «Corregir» (S13) esta plegado
  // y «Cancelar» queda al final, detras de un divisor.
  await expect(page.getByText("Siguiente paso")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Marcar en ejecución" }),
  ).toBeVisible();
  const pliegues = await page
    .locator("summary")
    .filter({ hasText: /Corregir intervención|Cancelar intervención/ })
    .allInnerTexts();
  expect(pliegues.map((texto) => texto.trim())).toEqual([
    "Corregir intervención…",
    "Cancelar intervención…",
  ]);

  const cancelar = page.locator("summary", {
    hasText: "Cancelar intervención",
  });
  await cancelar.click();
  await expect(
    page.getByText("Una intervención cancelada no se puede reabrir.", {
      exact: false,
    }),
  ).toBeVisible();
  const confirmacion = page.getByLabel(
    /Confirmo cancelar la intervención INT-/,
  );
  await expect(confirmacion).toBeVisible();
  await expect(confirmacion).not.toBeChecked();

  // Sin la casilla el navegador no envía el formulario: la confirmación no es
  // un dialogo de JavaScript.
  await page.getByRole("button", { name: "Cancelar la intervención" }).click();
  await expect(page.getByText("Planificada", { exact: true })).toBeVisible();

  await confirmacion.check();
  await page.getByRole("button", { name: "Cancelar la intervención" }).click();

  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
  await expect(page.getByText("Siguiente paso")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cancelar la intervención" }),
  ).toHaveCount(0);
});
