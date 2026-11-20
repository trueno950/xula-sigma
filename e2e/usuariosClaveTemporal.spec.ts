import { randomUUID } from "node:crypto";
import { type Browser, expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * S9 y S11 de `usuarios-ux` en el navegador, que es el único lugar donde se
 * pueden probar: la contraseña temporal se queda en pantalla hasta que la
 * operadora dice que ya la anotó, la URL pierde el token al pintarse la
 * tarjeta, y el aviso de restablecer no anuncia el éxito cuando la clave ya no
 * se puede ver.
 *
 * El hallazgo C1 de la auditoría era el contrario: con JavaScript la clave se
 * veía ~300 ms y desaparecía sola, porque el descarte del montaje era una
 * Server Action y una Server Action que toca cookies redibuja la ruta sin la
 * cabecera que trae la clave. Los dos hechos de Next y por qué la URL se
 * limpia al pintar están en `AGENTS.md`, nota de `usuarios`.
 *
 * No se espera `networkidle`: el panel mantiene abierto el stream de
 * `/eventos`, así que la red nunca queda ociosa.
 */

const NOMBRE = "Operadora de Mostrador";

const correoNuevo = () => `clave-temporal-${randomUUID()}@example.com`;

const avisoDe = (
  page: Parameters<typeof accederAMotul>[0],
  encabezado: string,
) => page.getByRole("region", { name: encabezado });

/** La clave esta en el segundo parrafo de la tarjeta: el primero la titula. */
const claveDe = async (
  page: Parameters<typeof accederAMotul>[0],
  encabezado: string,
) => (await avisoDe(page, encabezado).locator("p").nth(1).innerText()).trim();

/** Un acceso por test y la ventana de ritmo por correo es de cinco intentos. */
test.beforeEach(liberarVentanaDeRitmo);

const contextoSinJavaScript = async (browser: Browser) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  return browser.newContext({ javaScriptEnabled: false, storageState: estado });
};

const darDeAlta = async (
  page: Parameters<typeof accederAMotul>[0],
  correo: string,
) => {
  await page.goto(urlDe("motul", "/usuarios/alta"));
  await page.getByLabel("Nombre completo").fill(NOMBRE);
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Rol").selectOption("OPERADOR");
};

test("con JavaScript, la URL pierde el token al pintar la tarjeta y recargar no la vuelve a mostrar", async ({
  page,
}) => {
  await accederAMotul(page);
  await darDeAlta(page, correoNuevo());

  await page.getByRole("button", { name: "Dar de alta" }).click();

  const clave = await claveDe(page, "Contraseña temporal");
  expect(clave).toMatch(/^[A-Za-z0-9]{16}$/);

  // S9: el token sale de la URL apenas se pinta la tarjeta, así que una
  // recarga inmediata ya no es un GET con token.
  await expect(page).not.toHaveURL(/[?&]clave=/);
  await expect(page).not.toHaveURL(/[?&]ok=/);

  await page.reload();

  await expect(page.getByText(clave)).toHaveCount(0);
  await expect(avisoDe(page, "Contraseña temporal")).toHaveCount(0);
});

test("con JavaScript, la contraseña sigue en pantalla hasta que la operadora la da por anotada", async ({
  page,
}) => {
  await accederAMotul(page);
  await darDeAlta(page, correoNuevo());
  await page.getByRole("button", { name: "Dar de alta" }).click();

  const clave = await claveDe(page, "Contraseña temporal");

  // C1 era esto: dos segundos después de mostrarse, la clave seguía ahí.
  await page.waitForTimeout(2000);

  await expect(avisoDe(page, "Contraseña temporal")).toBeVisible();
  await expect(page.getByText(clave)).toHaveCount(1);

  // S9: solo se va cuando la operadora lo dice.
  await page.getByRole("button", { name: "Ya la anoté" }).click();
  await page.waitForURL(/\/usuarios$/);

  await expect(page.getByText(clave)).toHaveCount(0);

  // La URL quedó sin el token y la confirmación: recargar no la muestra ni
  // anuncia el alta sin la clave (S11).
  await page.reload();
  await expect(page.getByText(clave)).toHaveCount(0);
  await expect(page.getByText(/ya no se puede mostrar/)).toHaveCount(0);
});

test("sin JavaScript, el botón de darla por anotada también la quita y limpia la URL", async ({
  browser,
}) => {
  const contexto = await contextoSinJavaScript(browser);

  try {
    const page = await contexto.newPage();
    await darDeAlta(page, correoNuevo());

    await page.getByRole("button", { name: "Dar de alta" }).click();
    await page.waitForURL(/\/usuarios\?clave=[0-9a-f-]+&ok=alta$/);

    const clave = await claveDe(page, "Contraseña temporal");
    expect(clave).toMatch(/^[A-Za-z0-9]{16}$/);

    await page.getByRole("button", { name: "Ya la anoté" }).click();
    await page.waitForURL(/\/usuarios$/);

    await expect(page.getByText(clave)).toHaveCount(0);
    await expect(page.getByText(/ya no se puede mostrar/)).toHaveCount(0);
  } finally {
    await contexto.close();
  }
});

test("sin JavaScript, recargar la URL del alta no vuelve a mostrar la clave y manda a restablecer (S11)", async ({
  browser,
}) => {
  const contexto = await contextoSinJavaScript(browser);

  try {
    const page = await contexto.newPage();
    await darDeAlta(page, correoNuevo());

    await page.getByRole("button", { name: "Dar de alta" }).click();
    await page.waitForURL(/\/usuarios\?clave=[0-9a-f-]+&ok=alta$/);

    const clave = await claveDe(page, "Contraseña temporal");

    await page.reload();

    await expect(page.getByText(clave)).toHaveCount(0);
    await expect(page.getByText(/ya no se puede mostrar/)).toBeVisible();
    await expect(page.getByText("La cuenta quedó creada.")).toHaveCount(0);
  } finally {
    await contexto.close();
  }
});
