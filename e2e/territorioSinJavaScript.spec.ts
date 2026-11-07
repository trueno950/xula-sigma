import { type Browser, expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import {
  type EscenarioDeMudanza,
  leerDomicilioPorNumero,
  prepararEscenarioDeMudanza,
} from "./mudanza.fixture";
import { urlDe } from "./municipios";

/**
 * S1 de `territorio-pendientes`: `/territorio` transmitia su contenido
 * dentro de un `<Suspense>`, y sin JavaScript ese HTML llega oculto hasta
 * que un script lo inserta. La operadora con el script bloqueado veia el
 * esqueleto para siempre. `toBeVisible` es la prueba: un nodo dentro del
 * contenedor oculto existe en el DOM pero no se ve.
 */
let escenario: EscenarioDeMudanza;

test.beforeAll(async () => {
  escenario = await prepararEscenarioDeMudanza();
});

test.beforeEach(liberarVentanaDeRitmo);

/** La sesion se abre con script; lo que se prueba despues corre sin el. */
const contextoSinJavaScript = async (browser: Browser) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  return browser.newContext({ javaScriptEnabled: false, storageState: estado });
};

test("sin JavaScript, /territorio muestra el arbol del municipio", async ({
  browser,
}) => {
  const contexto = await contextoSinJavaScript(browser);
  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/territorio"));

    await expect(
      page.getByRole("list", { name: "Asentamientos del municipio" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Registrar domicilio", exact: true }),
    ).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("sin JavaScript, el alta de domicilio se ve y se envia", async ({
  browser,
}) => {
  const numero = `${escenario.domicilioId.slice(0, 4)}-SJ`;
  const contexto = await contextoSinJavaScript(browser);
  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/territorio?accion=domicilio"));

    const calle = page.getByLabel("Calle", { exact: true });
    await expect(calle).toBeVisible();
    await calle.selectOption(escenario.calleId);
    await page.getByLabel("Número", { exact: true }).fill(numero);
    await page
      .getByLabel("Colonia (opcional)")
      .selectOption(escenario.coloniaId);
    await page
      .getByRole("button", { name: "Registrar domicilio", exact: true })
      .click();

    await expect(page).toHaveURL(/ok=domicilio-creado/);
    await expect
      .poll(() => leerDomicilioPorNumero(escenario.calleId, numero))
      .not.toBeNull();
  } finally {
    await contexto.close();
  }
});
