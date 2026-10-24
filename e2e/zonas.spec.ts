import { expect, type Page, test } from "@playwright/test";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { CLAVE, CORREO, urlDe } from "./municipios";

/**
 * B3u-REFACTOR-06: navegacion real de las tres rutas de zonas, formulario
 * nativo de alta sin JavaScript y 404 cross-tenant.
 *
 * Se siembra un escenario nuevo con raiz `comisaria`: `cabecera` ya lo usa
 * `calles.spec.ts` en la misma base y solo admite una fila viva.
 */
let escenario: Scenario;

test.beforeAll(async () => {
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
});

/**
 * El limitador de accesos vive en memoria del proceso y la corrida completa
 * gasta intentos del mismo correo antes de llegar aca: sin vaciar la
 * ventana, este spec falla por el orden alfabetico de los archivos y no por
 * lo que prueba. Mismo remedio que `marca.spec.ts`.
 */
test.beforeEach(liberarVentanaDeRitmo);

async function acceder(page: Page): Promise<void> {
  await page.goto(urlDe("motul", "/acceso"));
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contraseña").fill(CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(urlDe("motul"));
}

const nombreDeZona = () => `Zona E2E ${escenario.origenId.slice(0, 8)}`;

test("las tres rutas de zonas navegan: territorio, listado y detalle", async ({
  page,
}) => {
  await acceder(page);

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
  await acceder(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  const contexto = await browser.newContext({
    javaScriptEnabled: false,
    storageState: estado,
  });
  const page = await contexto.newPage();

  const nombre = nombreDeZona();
  await page.goto(urlDe("motul", "/territorio/zonas"));
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

test("una zona de otro municipio responde 404, nunca 403 ni lista vacia", async ({
  page,
}) => {
  await acceder(page);

  const ajena = "60000000-0000-4000-8000-000000000001";
  const respuesta = await page.goto(
    urlDe("motul", `/territorio/zonas?zona=${ajena}`),
  );

  expect(respuesta?.status()).toBe(404);
});
