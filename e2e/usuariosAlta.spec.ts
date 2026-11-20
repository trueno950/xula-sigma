import { expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * El alta de una cuenta del ayuntamiento cuando el servidor la rechaza (S6,
 * S7 y S8 de `odd/tasks/usuarios-ux.md`).
 *
 * Lo que solo el navegador puede probar: que el formulario no tenga los
 * atributos con los que el navegador contesta **antes** que el servidor —su
 * mensaje sale en el idioma del navegador y sin JavaScript no hay otro—, que
 * el rechazo vuelva lleno con el token en la URL y nada mas, y que el titulo
 * de la pantalla no se repita.
 *
 * El rechazo corre sin JavaScript: la validacion nativa del navegador corre
 * igual sin script, asi que es la prueba de que el POST llega al servidor.
 */

test.beforeEach(liberarVentanaDeRitmo);

const SIN_ACCESO = "nadie@motul.example.com";

test("sin JavaScript, el rechazo vuelve con lo capturado y el mensaje en español", async ({
  browser,
}) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  const contexto = await browser.newContext({
    javaScriptEnabled: false,
    storageState: estado,
  });

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/usuarios/alta"));

    await page.getByLabel("Nombre completo").fill("Operadora de Turno");
    // Un correo sin arroba pasa el navegador y lo rechaza el servidor.
    await page.getByLabel("Correo").fill("operadora-sin-arroba");
    await page.getByLabel("Rol").selectOption("OPERADOR");
    await page.getByRole("button", { name: "Dar de alta" }).click();

    // El mensaje lo escribe el servidor, en espanol: es lo que prueba que el
    // navegador no contesto primero con el suyo.
    await expect(
      page.getByText("Escriba un correo válido, como nombre@municipio.gob.mx."),
    ).toBeVisible();

    // S6: lo capturado vuelve puesto, el rol incluido.
    await expect(page.getByLabel("Nombre completo")).toHaveValue(
      "Operadora de Turno",
    );
    await expect(page.getByLabel("Correo")).toHaveValue("operadora-sin-arroba");
    await expect(page.getByLabel("Rol")).toHaveValue("OPERADOR");

    // La URL lleva solo el token: el correo y el nombre son datos de una
    // persona y no van al log de accesos del servidor.
    expect(page.url()).toMatch(/[?&]borrador=[0-9a-f-]{36}/);
    expect(page.url()).not.toContain("operadora-sin-arroba");
    expect(page.url()).not.toContain("Operadora+de+Turno");
  } finally {
    await contexto.close();
  }
});

test("el nombre corto se explica antes de escribir y lo rechaza el servidor en español", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/usuarios/alta"));

  // S7: el minimo se lee como ayuda del campo, antes de escribir.
  await expect(page.getByText("Al menos 3 letras")).toBeVisible();

  await page.getByLabel("Nombre completo").fill("ab");
  await page.getByLabel("Correo").fill(SIN_ACCESO);
  await page.getByLabel("Rol").selectOption("CONSULTA");
  await page.getByRole("button", { name: "Dar de alta" }).click();

  await expect(
    page.getByText("El nombre debe tener al menos 3 letras."),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre completo")).toHaveValue("ab");
});

test("sin rol elegido lo dice el servidor, en español", async ({ page }) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/usuarios/alta"));

  await page.getByLabel("Nombre completo").fill("Operadora de Turno");
  await page.getByLabel("Correo").fill(SIN_ACCESO);
  await page.getByRole("button", { name: "Dar de alta" }).click();

  await expect(page.getByText("Elija un rol.")).toBeVisible();
});

/**
 * S8: la migaja dice el camino y el encabezado nombra la pantalla, una sola
 * vez entre los dos.
 */
test("la migaja y el encabezado no dicen lo mismo dos veces", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/usuarios/alta"));

  const encabezado = page.getByRole("heading", { name: "Nuevo usuario" });
  await expect(encabezado).toHaveCount(1);

  const migaja = page.getByRole("navigation", { name: "Ruta" });
  await expect(migaja.getByRole("link", { name: "Usuarios" })).toBeVisible();
  await expect(migaja).not.toContainText("Nuevo usuario");
});
