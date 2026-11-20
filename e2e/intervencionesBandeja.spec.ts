import { expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * S1-S5 de `intervenciones-ux`, contra la aplicación construida y Postgres
 * real: el tablero por estado (cuatro columnas con su cuenta), la tarjeta con
 * identificador, trozo y origen, el orden declarado y el vacío por filtro con
 * etiquetas.
 *
 * El escenario de `calles.fixture` siembra dos intervenciones `PLANIFICADA` en
 * la comisaría de origen y deja `vacioId` —un lugar sin obras— para el vacío
 * por filtro. `tipoDeRaiz: "comisaria"` porque `calles.spec.ts` ya ocupa la
 * única cabecera de Motul.
 */

let escenario: Scenario;

test.beforeAll(async () => {
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
});

test.beforeEach(liberarVentanaDeRitmo);

const ESTADOS = ["Planificada", "En ejecución", "Finalizada", "Cancelada"];

test("el tablero agrupa las obras por estado, con su cuenta y su tarjeta", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/intervenciones"));

  for (const estado of ESTADOS) {
    await expect(
      page.getByRole("heading", { name: estado, exact: true }),
    ).toBeVisible();
  }

  await expect(
    page.getByRole("link", { name: /^INT-[0-9A-F]{4}: / }).first(),
  ).toBeVisible();
  await expect(page.getByText(/\d+ intervenciones/)).toBeVisible();
  await expect(
    page.getByText(/la ocurrencia más reciente va primero/),
  ).toBeVisible();
  await expect(
    page.getByText("La bandeja de intervenciones todavía no está disponible."),
  ).toHaveCount(0);
});

test("una columna vacía por filtro conserva su encabezado y ofrece quitar el filtro", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(
    urlDe("motul", `/intervenciones?lugarId=${escenario.vacioId}`),
  );

  await expect(
    page.getByRole("heading", { name: "Planificada", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Ninguna planificada en /)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Quitar los filtros" }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Todavía no hay intervenciones registradas."),
  ).toHaveCount(0);
});

test.describe("en el celular", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("los filtros van plegados en «Filtros (N)» y el chip los quita", async ({
    page,
  }) => {
    await accederAMotul(page);
    await page.goto(urlDe("motul", "/intervenciones"));

    const pliegue = page.locator("summary", { hasText: "Filtros" });
    await expect(pliegue).toBeVisible();
    await expect(page.getByLabel("Tipo", { exact: true })).toBeHidden();

    await pliegue.click();
    await page
      .getByLabel("Tipo", { exact: true })
      .selectOption("MANTENIMIENTO");
    await page.getByRole("button", { name: "Filtrar" }).click();

    await expect(page).toHaveURL(/tipo=MANTENIMIENTO/);
    await expect(
      page.getByRole("link", { name: /Quitar filtro: Tipo: Mantenimiento/ }),
    ).toBeVisible();
  });
});
