import { expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * Cerrar sesion desde el panel: que la sesion muera en el servidor, no solo
 * que el navegador olvide la cookie. Esto ultimo es lo unico que un test de
 * cookies veria, y una cookie robada o copiada seguiria sirviendo.
 */
test.beforeEach(liberarVentanaDeRitmo);

test("cerrar sesion la revoca en el servidor y vuelve al acceso", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.route(urlDe("motul", "/api/salud"), (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"/>',
    }),
  );
  await accederAMotul(page);

  await page.goto(urlDe("motul", "/padron"));
  const conSesion = await page.context().cookies();

  // Control del test: mientras la sesion vive, la cookie copiada si sirve.
  // Sin esto, la ultima asercion pasaria tambien con una cookie invalida.
  await page.context().clearCookies();
  await page.context().addCookies(conSesion);
  await page.goto(urlDe("motul", "/padron"));
  await expect(page).toHaveURL(urlDe("motul", "/padron"));

  const datosDeError: Promise<string | undefined>[] = [];
  const erroresDePagina: string[] = [];
  page.on("console", (mensaje) => {
    if (!mensaje.text().includes("[cerrarSesion]")) return;
    const registro = mensaje.args()[1];
    if (!registro) return;
    datosDeError.push(
      registro.jsonValue().then((valor) => JSON.stringify(valor)),
    );
  });
  page.on("pageerror", (error) => erroresDePagina.push(error.message));
  await page.evaluate(() => {
    const fetchOriginal = window.fetch.bind(window);
    let falla = true;
    window.fetch = async (input, init) => {
      if (falla && String(input).includes("/api/auth/sign-out")) {
        falla = false;
        throw new RangeError("detalle privado de prueba");
      }
      return fetchOriginal(input, init);
    };
  });

  const cerrar = page.getByRole("button", { name: "Cerrar sesión" });
  await cerrar.click();
  await expect(page.locator("header").getByRole("alert")).toHaveText(
    "No se pudo cerrar la sesión. Intente de nuevo.",
  );
  await expect(cerrar).toBeEnabled();
  await expect(
    page.getByRole("link", {
      name: `${MUNICIPIOS.motul.nombre}, Xula Sigma`,
    }),
  ).toBeVisible();
  await expect(page.locator("header img")).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Modulos" })
      .getByRole("link", { name: "Territorio" }),
  ).toBeVisible();
  expect(
    await cerrar.evaluate((boton) => boton.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  const medidasDeCabecera = await page
    .locator("header")
    .evaluate((cabecera) => ({
      contenido: cabecera.scrollWidth,
      disponible: cabecera.clientWidth,
    }));
  expect(medidasDeCabecera.contenido).toBeLessThanOrEqual(
    medidasDeCabecera.disponible,
  );
  await expect.poll(() => datosDeError.length).toBe(1);
  const registroSeguro = await datosDeError[0];
  expect(registroSeguro).toContain('"name":"RangeError"');
  expect(registroSeguro).toContain('"traza":"');
  expect(registroSeguro).not.toContain("detalle privado de prueba");
  expect(erroresDePagina).toEqual([]);

  await cerrar.click();
  await expect(page).toHaveURL(urlDe("motul", "/acceso"));

  await page.goto(urlDe("motul", "/padron"));
  await expect(page).toHaveURL(urlDe("motul", "/acceso"));

  // La misma cookie de antes del cierre, devuelta al navegador: si la fila
  // de la sesion siguiera viva, entraria.
  await page.context().addCookies(conSesion);
  await page.goto(urlDe("motul", "/padron"));
  await expect(page).toHaveURL(urlDe("motul", "/acceso"));
});
