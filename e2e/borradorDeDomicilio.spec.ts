import { expect, type Page, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import {
  type EscenarioDeMudanza,
  leerDomicilioPorNumero,
  prepararEscenarioDeMudanza,
} from "./mudanza.fixture";
import { urlDe } from "./municipios";

let escenario: EscenarioDeMudanza;

test.beforeAll(async () => {
  escenario = await prepararEscenarioDeMudanza();
});

const RECHAZO = "Las calles del domicilio deben ser distintas entre sí.";
const REFERENCIA = "Junto a la cancha, portón azul";

/**
 * Captura un alta que el servidor rechaza: la misma calle como transversal
 * de si misma pasa el formulario y la frena `TransversalRepetidaError`.
 */
const capturarAltaRechazada = async (page: Page, numero: string) => {
  await page.goto(urlDe("motul", "/territorio?accion=domicilio"));
  await page
    .getByLabel("Calle", { exact: true })
    .selectOption(escenario.calleId);
  await page.getByLabel("Número", { exact: true }).fill(numero);
  await page.getByLabel("Colonia (opcional)").selectOption(escenario.coloniaId);
  await page
    .getByLabel("Entre calle", { exact: true })
    .selectOption(escenario.calleId);
  await page.getByLabel("Referencia", { exact: true }).fill(REFERENCIA);
  await page
    .getByRole("button", { name: "Registrar domicilio", exact: true })
    .click();
  await expect(page.getByText(RECHAZO)).toBeVisible();
};

const esperarLoCapturado = async (page: Page, numero: string) => {
  await expect(page.getByLabel("Número", { exact: true })).toHaveValue(numero);
  await expect(page.getByLabel("Referencia", { exact: true })).toHaveValue(
    REFERENCIA,
  );
  await expect(page.getByLabel("Calle", { exact: true })).toHaveValue(
    escenario.calleId,
  );
  await expect(page.getByLabel("Colonia (opcional)")).toHaveValue(
    escenario.coloniaId,
  );
  // La URL lleva solo el token: la dirección no llega a los logs.
  expect(page.url()).toMatch(/[?&]borrador=[0-9a-f-]{36}/);
  expect(page.url()).not.toContain(numero);
};

test("un alta rechazada vuelve con lo capturado y el borrador no sobrevive al exito", async ({
  page,
}) => {
  const numero = `${escenario.domicilioId.slice(0, 4)}-B1`;
  await accederAMotul(page);

  await capturarAltaRechazada(page, numero);
  await esperarLoCapturado(page, numero);
  // Recargar es una carga completa: lo que rellena es la cookie, no el DOM.
  await page.reload();
  await esperarLoCapturado(page, numero);
  const conBorrador = page.url();

  await page
    .getByLabel("Entre calle", { exact: true })
    .selectOption({ label: "Ninguna" });
  await page
    .getByRole("button", { name: "Registrar domicilio", exact: true })
    .click();
  await expect(page).toHaveURL(/ok=domicilio-creado/);
  await expect
    .poll(() => leerDomicilioPorNumero(escenario.calleId, numero))
    .not.toBeNull();

  // El exito borro la cookie: el mismo token ya no rellena nada.
  await page.goto(conBorrador);
  await expect(page.getByLabel("Número", { exact: true })).toHaveValue("");
});

/**
 * `/territorio` no se puede recorrer sin JavaScript: `page.tsx` pinta el
 * contenido dentro de un `<Suspense>` y el HTML transmitido queda oculto
 * hasta que un script lo inserta, asi que el formulario no es visible. Lo
 * que se prueba aca es la parte del borrador: la pagina que rellena el
 * formulario la arma el servidor con la cookie, sin ejecutar un script.
 */
test("sin JavaScript, el servidor arma el alta con lo capturado", async ({
  browser,
}) => {
  const conJs = await browser.newContext();
  const page = await conJs.newPage();
  const numero = `${escenario.domicilioId.slice(0, 4)}-B2`;
  await accederAMotul(page);
  await capturarAltaRechazada(page, numero);
  const conBorrador = page.url();
  const estado = await conJs.storageState();
  await conJs.close();

  const contexto = await browser.newContext({
    javaScriptEnabled: false,
    storageState: estado,
  });
  try {
    const sinJs = await contexto.newPage();
    await sinJs.goto(conBorrador);
    const html = await sinJs.content();

    expect(html).toContain(`value="${numero}"`);
    expect(html).toContain(`value="${REFERENCIA}"`);
    expect(await leerDomicilioPorNumero(escenario.calleId, numero)).toBeNull();
  } finally {
    await contexto.close();
  }
});
