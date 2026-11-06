import { expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * B3u-REFACTOR-06: navegacion real de las tres rutas de zonas, formulario
 * nativo de alta sin JavaScript y 404 cross-tenant. T2 de
 * `territorio-visual`: el ciclo completo de una zona por la interfaz nueva,
 * con la baja detras de su `<details>` y no en la fila del listado.
 *
 * Se siembra un escenario nuevo con raiz `comisaria`: `cabecera` ya lo usa
 * `calles.spec.ts` en la misma base y solo admite una fila viva.
 */
let escenario: Scenario;

test.beforeAll(async () => {
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
});

test.beforeEach(liberarVentanaDeRitmo);

const nombreDeZona = () => `Zona E2E ${escenario.origenId.slice(0, 8)}`;

test("las tres rutas de zonas navegan: territorio, listado y detalle", async ({
  page,
}) => {
  await accederAMotul(page);

  await page.goto(urlDe("motul", "/territorio"));
  await page.getByRole("link", { name: "Zonas operativas" }).click();
  await expect(page).toHaveURL(urlDe("motul", "/territorio/zonas"));
  await expect(page.getByRole("heading", { name: "Zonas" })).toBeVisible();

  await expect(page.getByRole("button", { name: "Crear zona" })).toBeVisible();
});

test("el alta de zona funciona como POST nativo, sin JavaScript", async ({
  browser,
}) => {
  // El formulario de acceso habilita su boton con JavaScript: se inicia
  // sesion con JS y se reusa la cookie en un contexto sin JS. Lo que se
  // prueba es el POST del formulario de zonas, no el del acceso.
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  const contexto = await browser.newContext({
    javaScriptEnabled: false,
    storageState: estado,
  });
  const page = await contexto.newPage();

  const nombre = nombreDeZona();
  await page.goto(urlDe("motul", "/territorio/zonas"));
  await page.getByLabel("Asentamiento").selectOption(escenario.origenId);
  await page.getByLabel("Nombre de la zona").fill(nombre);
  await page.getByRole("button", { name: "Crear zona" }).click();

  await expect(page).toHaveURL(/\/territorio\/zonas\?ok=zona-alta/);
  await expect(page.getByText("Zona creada.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(nombre) }),
  ).toBeVisible();

  // El detalle es la tercera ruta: la zona recien creada abre con sus pestanas.
  await page.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Vistas de la zona" }),
  ).toBeVisible();

  await contexto.close();
});

test("la zona se renombra, suma y quita calles y se da de baja desde su detalle", async ({
  page,
}) => {
  await accederAMotul(page);
  const marca = escenario.origenId.slice(0, 8);
  const nombre = `Zona ciclo ${marca}`;
  const renombrada = `Zona ciclo renombrada ${marca}`;

  await page.goto(urlDe("motul", "/territorio/zonas"));
  await page.getByLabel("Asentamiento").selectOption(escenario.origenId);
  await page.getByLabel("Nombre de la zona").fill(nombre);
  await page.getByRole("button", { name: "Crear zona" }).click();
  await expect(page).toHaveURL(/\/territorio\/zonas\?ok=zona-alta/);

  // La fila solo navega: la baja ya no se ofrece desde el listado.
  await expect(page.getByRole("button", { name: /Dar de baja/ })).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: new RegExp(`^${nombre},`) }).click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();

  await page.locator("summary", { hasText: "Renombrar" }).click();
  await page.getByLabel("Nombre de la zona").fill(renombrada);
  await page.getByRole("button", { name: "Guardar nombre" }).click();
  await expect(page.getByText("Nombre de la zona actualizado.")).toBeVisible();
  await expect(page.getByRole("heading", { name: renombrada })).toBeVisible();

  await page
    .getByLabel("Calle del asentamiento")
    .selectOption({ label: escenario.domicilio });
  await page.getByRole("button", { name: "Agregar a la zona" }).click();
  await expect(page.getByText("Calle agregada a la zona.")).toBeVisible();

  await page
    .getByRole("button", { name: `Quitar ${escenario.domicilio} de la zona` })
    .click();
  await expect(page.getByText("Calle quitada de la zona.")).toBeVisible();

  await page.locator("summary", { hasText: "Dar de baja" }).click();
  await page.getByRole("button", { name: `Dar de baja ${renombrada}` }).click();
  await expect(page).toHaveURL(/\/territorio\/zonas\?ok=zona-baja/);
  await expect(page.getByText("Zona dada de baja.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(renombrada) }),
  ).toHaveCount(0);
});

test("una zona de otro municipio responde 404, nunca 403 ni lista vacia", async ({
  page,
}) => {
  await accederAMotul(page);

  const ajena = "60000000-0000-4000-8000-000000000001";
  const respuesta = await page.goto(
    urlDe("motul", `/territorio/zonas?zona=${ajena}`),
  );

  expect(respuesta?.status()).toBe(404);
});
