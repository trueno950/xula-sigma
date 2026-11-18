import {
  type Browser,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";
import { accederAMotul } from "./acceder";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * S11-S15 de `reportes-ux`, contra la aplicacion construida y Postgres real:
 * el detalle abre en dos columnas a 1440 con el panel de acciones pegado
 * arriba, a 390 el orden es ficha, acciones e historial sin nada bajo la
 * barra inferior, y los formularios nativos siguen funcionando sin
 * JavaScript.
 *
 * El escenario de `calles.fixture` -con raiz `comisaria`, porque
 * `calles.spec.ts` ya ocupa la unica cabecera de Motul- trae un reporte
 * `RECIBIDO` con calle, que es el caso que S11 enlaza.
 */
let escenario: Scenario;

test.beforeAll(async () => {
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
});

test.beforeEach(liberarVentanaDeRitmo);

const cajaDe = async (locator: Locator) => {
  const caja = await locator.boundingBox();
  if (!caja) throw new Error("El elemento no está en pantalla.");
  return caja;
};

const abrirElDetalle = async (page: Page): Promise<void> => {
  await page.goto(urlDe("motul", `/reportes?q=${escenario.folio}`));
  await page.getByRole("link", { name: new RegExp(escenario.folio) }).click();
  await expect(page).toHaveURL(/\/reportes\/detalle\/[0-9a-f-]{36}$/);
};

const panelDeAcciones = (page: Page) =>
  page.getByRole("complementary", { name: "Acciones" });

test("a 1440 el detalle abre en dos columnas y el panel queda pegado arriba", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrirElDetalle(page);

  const ficha = await cajaDe(
    page.getByRole("heading", { name: "Ficha del reporte" }),
  );
  const acciones = await cajaDe(
    page.getByRole("heading", { name: "Acciones", exact: true }),
  );

  // Dos columnas: el panel arranca a la derecha de la ficha y a su misma
  // altura, no debajo de ella.
  expect(acciones.x).toBeGreaterThan(ficha.x);
  expect(Math.round(acciones.y)).toBe(Math.round(ficha.y));

  const panel = panelDeAcciones(page);
  await expect(panel).toBeVisible();
  expect(await panel.evaluate((nodo) => getComputedStyle(nodo).position)).toBe(
    "sticky",
  );
  await expect(panel).toContainText("Siguiente paso");
  await expect(panel).toContainText("Marcar en atención");

  // S11: con calle, la ficha enlaza al historial de la calle y al mapa.
  await expect(
    page.getByRole("link", { name: "Ver historial de la calle" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ver en el mapa" }),
  ).toBeVisible();
});

test("a 390 el orden es ficha, acciones e historial, y nada queda bajo la barra inferior", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirElDetalle(page);

  const ficha = await cajaDe(
    page.getByRole("heading", { name: "Ficha del reporte" }),
  );
  const acciones = await cajaDe(
    page.getByRole("heading", { name: "Acciones", exact: true }),
  );
  const historial = await cajaDe(
    page.getByRole("heading", { name: "Historial", exact: true }),
  );

  expect(ficha.y).toBeLessThan(acciones.y);
  expect(acciones.y).toBeLessThan(historial.y);
  // Apiladas: una sola columna, la misma coordenada horizontal.
  expect(Math.round(acciones.x)).toBe(Math.round(ficha.x));

  // S15: el historial cierra el detalle y, con la pagina al final, no queda
  // tapado por la barra inferior.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const seccion = await cajaDe(
    page.getByRole("heading", { name: "Historial", exact: true }).locator(".."),
  );
  const barra = await cajaDe(
    page.getByRole("navigation", { name: "Navegación principal" }),
  );
  expect(seccion.y + seccion.height).toBeLessThanOrEqual(barra.y);
});

test("las acciones plegadas son un acordeon y el panel cabe en la pantalla", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrirElDetalle(page);

  const desplegable = (texto: string) =>
    page.locator("details", {
      has: page.locator("summary", { hasText: texto }),
    });
  for (const texto of [
    "Programar obra…",
    "Asignar área…",
    "Rechazar reporte…",
  ]) {
    await desplegable(texto).locator("summary").click();
    await expect(desplegable(texto)).toHaveJSProperty("open", true);
  }
  // Abrir el ultimo cerro los anteriores: el panel no se apila.
  await expect(desplegable("Programar obra…")).toHaveJSProperty("open", false);
  await expect(desplegable("Asignar área…")).toHaveJSProperty("open", false);

  const panel = await cajaDe(
    page.getByRole("complementary", { name: "Acciones" }),
  );
  expect(panel.height).toBeLessThanOrEqual(900);
});

test("sin JavaScript el paso siguiente y la asignacion de area siguen funcionando", async ({
  browser,
}: {
  browser: Browser;
}) => {
  const contexto = await contextoSinJavaScript(browser);
  try {
    const page = await contexto.newPage();
    await abrirElDetalle(page);

    await page.getByRole("button", { name: "Marcar en atención" }).click();
    await expect(page.getByText("En atención", { exact: true })).toBeVisible();
    await expect(page.getByText("Recibido → En atención")).toBeVisible();

    // El desplegable abre sin JavaScript: es un `<details>` nativo.
    await page.locator("summary").filter({ hasText: "Asignar área…" }).click();
    await page.getByLabel("Área responsable").selectOption("OBRAS_PUBLICAS");
    await page
      .getByRole("button", { name: "Asignar área", exact: true })
      .click();

    await expect(page.getByText("Área asignada: Obras públicas")).toBeVisible();
  } finally {
    await contexto.close();
  }
});

/** La sesion se abre con script; lo que se prueba despues corre sin el. */
const contextoSinJavaScript = async (browser: Browser) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  return browser.newContext({ javaScriptEnabled: false, storageState: estado });
};
