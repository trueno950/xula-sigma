import { type Browser, expect, type Page, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * S1 y S2 de `intervenciones-trazabilidad`, contra la aplicacion construida y
 * Postgres real.
 *
 * El escenario de `calles.fixture` -con raiz `comisaria`, porque
 * `calles.spec.ts` ya ocupa la unica cabecera de Motul- trae un reporte
 * `RECIBIDO` en una calle con punto y dos intervenciones `PLANIFICADA`. Sobre
 * eso se prueba lo que el usuario pidio: registrar obra desde la bandeja,
 * programar obra desde el reporte, y que al finalizar la obra el reporte se
 * cierre solo.
 */
let escenario: Scenario;

test.beforeAll(async () => {
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
});

test.beforeEach(liberarVentanaDeRitmo);

const abrirBandeja = async (page: Page, consulta = "") => {
  await page.goto(urlDe("motul", `/intervenciones${consulta}`));
};

const registrarDesdeLaBandeja = async (page: Page, tipo: string) => {
  await page.goto(urlDe("motul", "/intervenciones/alta"));
  await page.getByLabel("Tipo de obra").selectOption(tipo);
  await page
    .getByLabel("Lugar", { exact: true })
    .selectOption(escenario.origenId);
  await page.getByLabel("Fecha de ocurrencia").fill("2026-11-16");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Pavimentacion de la calle 20 entre 15 y 17");
  await page.getByRole("button", { name: "Registrar intervención" }).click();

  await expect(page).toHaveURL(/\/intervenciones\/[0-9a-f-]{36}$/);
};

test("la bandeja lista las obras del municipio y ofrece el alta", async ({
  page,
}) => {
  await accederAMotul(page);
  await abrirBandeja(page);

  await expect(
    page.getByRole("heading", { name: "Intervenciones", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Registrar intervención" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Obra, Planificada/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("La bandeja de intervenciones todavía no está disponible."),
  ).toHaveCount(0);
});

test("los filtros de la bandeja acotan por tipo y estado", async ({ page }) => {
  await accederAMotul(page);
  await abrirBandeja(page, "?tipo=BACHE&estado=FINALIZADA");

  await expect(
    page.getByRole("link", { name: "Quitar filtro: Tipo: Bache" }),
  ).toBeVisible();
  await expect(
    page.getByText("Todavía no hay intervenciones registradas."),
  ).toHaveCount(0);
});

test("registra una intervencion desde la bandeja y la ve planificada", async ({
  page,
}) => {
  await accederAMotul(page);
  await registrarDesdeLaBandeja(page, "PAVIMENTACION");

  await expect(
    page.getByRole("heading", { name: "Intervención Pavimentación" }),
  ).toBeVisible();
  await expect(page.getByText("Planificada", { exact: true })).toBeVisible();
  await expect(page.getByText("2026-11-16").first()).toBeVisible();
});

test("programar obra desde el reporte y finalizarla cierra el reporte", async ({
  page,
}) => {
  test.slow();
  await accederAMotul(page);

  await page.goto(urlDe("motul", `/reportes?q=${escenario.folio}`));
  await page.getByRole("link", { name: new RegExp(escenario.folio) }).click();
  await expect(page).toHaveURL(/\/reportes\/detalle\/[0-9a-f-]{36}$/);
  const reporteUrl = page.url();

  await expect(
    page.getByRole("heading", { name: "Programar obra" }),
  ).toBeVisible();
  await page.getByLabel("Tipo de obra").selectOption("BACHE");
  await page
    .getByLabel("Descripción del trabajo")
    .fill("Bacheo de la calle frente al parque");
  await page.getByRole("button", { name: "Programar obra" }).click();

  // `exact` porque el `getByText` de Playwright busca subcadena sin distinguir
  // mayusculas: sin el, "En atención" tambien casa con el boton "Marcar en
  // atención" de las transiciones y el test seguiria antes de que la accion
  // confirme.
  await expect(page.getByText("En atención", { exact: true })).toBeVisible();

  await abrirBandeja(page, "?tipo=BACHE&estado=PLANIFICADA");
  await expect(
    page.getByRole("link", { name: /Bache, Planificada/ }).first(),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Bache, Planificada/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Marcar en ejecución" }).click();
  await page.getByRole("button", { name: "Marcar finalizada" }).click();
  await expect(page.getByText("Finalizada", { exact: true })).toBeVisible();

  await page.goto(reporteUrl);
  await expect(page.getByText("Resuelto", { exact: true })).toBeVisible();
  await expect(page.getByText("En atención → Resuelto")).toBeVisible();

  // S5: el historial de la calle dice qué obra se hizo, con su fecha y el
  // enlace al reporte de origen, en vez de la frase genérica.
  await page.goto(
    urlDe("motul", `/calles/${escenario.reporteCalleId}/historial`),
  );
  const obra = page.getByRole("listitem").filter({
    hasText: "Bache · finalizada",
  });
  await expect(obra).toBeVisible();
  await expect(obra.locator("time")).toHaveCount(1);
  await expect(
    obra.getByRole("link", { name: "Ver reporte de origen" }),
  ).toBeVisible();
  await expect(
    page.getByText("Se registró una intervención en esta calle."),
  ).toHaveCount(0);
});

test("sin JavaScript, el alta de intervencion se ve y se envia", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  const sinJs = await browser.newContext({
    javaScriptEnabled: false,
    storageState: estado,
  });

  try {
    const page = await sinJs.newPage();
    await page.goto(urlDe("motul", "/intervenciones/alta"));

    await expect(
      page.getByRole("heading", { name: "Registrar intervención" }),
    ).toBeVisible();
    await page.getByLabel("Tipo de obra").selectOption("BACHE");
    await page
      .getByLabel("Lugar", { exact: true })
      .selectOption(escenario.origenId);
    await page.getByLabel("Calle (opcional)").selectOption(escenario.movibleId);
    await page.getByLabel("Fecha de ocurrencia").fill("2026-11-15");
    await page
      .getByLabel("Descripción", { exact: true })
      .fill("Bacheo de la calle 20 sin JavaScript");
    await page.getByRole("button", { name: "Registrar intervención" }).click();

    await expect(page).toHaveURL(/\/intervenciones\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", { name: "Intervención Bache" }),
    ).toBeVisible();
  } finally {
    await sinJs.close();
  }
});
