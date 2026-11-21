import { randomUUID } from "node:crypto";
import { type Browser, expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * S9, S10 y S11 de `usuarios-ux` en el navegador, que es el único lugar donde
 * se pueden probar: la contraseña temporal se queda en pantalla hasta que la
 * operadora dice que ya la anotó, «Copiar» la deja en el portapapeles —y sin
 * JavaScript no hay «Copiar», que es la mejora progresiva—, la URL pierde el
 * token al pintarse la tarjeta, y el aviso de restablecer no anuncia el éxito
 * cuando la clave ya no se puede ver: dice de quién era y ofrece restablecerla
 * otra vez.
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

/** S10: el portapapeles es del navegador y hay que pedirlo por contexto. */
test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const NOMBRE = "Operadora de Mostrador";

const correoNuevo = () => `clave-temporal-${randomUUID()}@example.com`;

const avisoDe = (
  page: Parameters<typeof accederAMotul>[0],
  encabezado: string,
) => page.getByRole("region", { name: encabezado });

/** La clave esta en el segundo parrafo de la tarjeta: el primero la titula. */
const claveDe = async (page: Parameters<typeof accederAMotul>[0]) =>
  (
    await avisoDe(page, "Contraseña temporal").locator("p").nth(1).innerText()
  ).trim();

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

  const clave = await claveDe(page);
  expect(clave).toMatch(/^[A-Za-z0-9]{16}$/);

  // S10: la tarjeta dice de quién es la clave —nombre, correo y rol—, porque
  // mientras está arriba el listado sigue ofreciendo «Restablecer».
  await expect(avisoDe(page, "Contraseña temporal")).toContainText(NOMBRE);
  await expect(avisoDe(page, "Contraseña temporal")).toContainText(
    "rol Operador",
  );

  // S9: el token sale de la URL apenas se pinta la tarjeta, así que una
  // recarga inmediata ya no es un GET con token.
  await expect(page).not.toHaveURL(/[?&]clave=/);
  await expect(page).not.toHaveURL(/[?&]ok=/);

  await page.reload();

  await expect(page.getByText(clave)).toHaveCount(0);
  await expect(avisoDe(page, "Contraseña temporal")).toHaveCount(0);
});

test("con JavaScript, «Copiar» deja la contraseña en el portapapeles y lo anuncia", async ({
  page,
}) => {
  await accederAMotul(page);
  await darDeAlta(page, correoNuevo());
  await page.getByRole("button", { name: "Dar de alta" }).click();

  const clave = await claveDe(page);

  await page.bringToFront();
  await page.getByRole("button", { name: "Copiar" }).click();

  // El anuncio va en la región viva de la tarjeta, no en un diálogo que haya
  // que cerrar: la operadora sigue donde estaba.
  await expect(
    page.getByText("Contraseña copiada al portapapeles."),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(clave);
});

test("con JavaScript, la contraseña sigue en pantalla hasta que la operadora la da por anotada", async ({
  page,
}) => {
  await accederAMotul(page);
  await darDeAlta(page, correoNuevo());
  await page.getByRole("button", { name: "Dar de alta" }).click();

  const clave = await claveDe(page);

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

    const clave = await claveDe(page);
    expect(clave).toMatch(/^[A-Za-z0-9]{16}$/);

    // S10 al revés: sin JavaScript el botón no se pinta. La clave queda
    // seleccionable, que es el texto que la propia tarjeta explica.
    await expect(page.getByRole("button", { name: "Copiar" })).toHaveCount(0);
    await expect(
      page.getByText("seleccione la contraseña", { exact: false }),
    ).toBeVisible();

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

    const clave = await claveDe(page);

    await page.reload();

    await expect(page.getByText(clave)).toHaveCount(0);
    // S11: sin la clave a la vista, el aviso dice de quién era y ofrece
    // restablecerla otra vez, en vez de anunciar un éxito vacío.
    await expect(
      page.getByText(
        `La contraseña temporal de ${NOMBRE} ya no se puede mostrar.`,
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: `Restablecer la contraseña de ${NOMBRE}`,
      }),
    ).toBeVisible();
    await expect(page.getByText("La cuenta quedó creada.")).toHaveCount(0);
  } finally {
    await contexto.close();
  }
});
