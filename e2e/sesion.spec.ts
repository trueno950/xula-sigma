import { expect, test } from "@playwright/test";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { CLAVE, CORREO, urlDe } from "./municipios";

/**
 * Cerrar sesion desde el panel: que la sesion muera en el servidor, no solo
 * que el navegador olvide la cookie. Esto ultimo es lo unico que un test de
 * cookies veria, y una cookie robada o copiada seguiria sirviendo.
 */
test.beforeEach(liberarVentanaDeRitmo);

test("cerrar sesion la revoca en el servidor y vuelve al acceso", async ({
  page,
}) => {
  await page.goto(urlDe("motul", "/acceso"));
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contrasenia").fill(CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(urlDe("motul"));

  await page.goto(urlDe("motul", "/padron"));
  const conSesion = await page.context().cookies();

  // Control del test: mientras la sesion vive, la cookie copiada si sirve.
  // Sin esto, la ultima asercion pasaria tambien con una cookie invalida.
  await page.context().clearCookies();
  await page.context().addCookies(conSesion);
  await page.goto(urlDe("motul", "/padron"));
  await expect(page).toHaveURL(urlDe("motul", "/padron"));

  await page
    .locator("header")
    .getByRole("button", { name: "Cerrar sesión" })
    .click();
  await expect(page).toHaveURL(urlDe("motul", "/acceso"));

  await page.goto(urlDe("motul", "/padron"));
  await expect(page).toHaveURL(urlDe("motul", "/acceso"));

  // La misma cookie de antes del cierre, devuelta al navegador: si la fila
  // de la sesion siguiera viva, entraria.
  await page.context().addCookies(conSesion);
  await page.goto(urlDe("motul", "/padron"));
  await expect(page).toHaveURL(urlDe("motul", "/acceso"));
});
