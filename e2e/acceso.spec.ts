import { expect, test } from "@playwright/test";
import { CLAVE, CORREO, MUNICIPIOS, urlDe } from "./municipios";

/**
 * Lo que solo se puede probar con un navegador de verdad: el **alcance de
 * la cookie**.
 *
 * Los tests de integracion ya cubren que el acceso de Motul resuelva contra
 * la persona de Motul. Lo que ninguno puede cubrir es que la cookie que
 * emite `motul.localhost` no viaje a `ticul.localhost`, porque eso no lo
 * decide nuestro codigo sino el navegador aplicando el alcance que Better
 * Auth le puso. Sin `crossSubDomainCookies`, cada municipio queda con la
 * suya. Aca se comprueba que efectivamente sea asi.
 */

async function acceder(
  page: import("@playwright/test").Page,
  municipio: keyof typeof MUNICIPIOS,
) {
  await page.goto(urlDe(municipio, "/acceso"));
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contrasenia").fill(CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("la pantalla de acceso muestra el municipio del subdominio", async ({
  page,
}) => {
  await page.goto(urlDe("motul", "/acceso"));
  await expect(
    page.getByRole("heading", { name: MUNICIPIOS.motul.nombre }),
  ).toBeVisible();

  await page.goto(urlDe("ticul", "/acceso"));
  await expect(
    page.getByRole("heading", { name: MUNICIPIOS.ticul.nombre }),
  ).toBeVisible();
});

test("en el dominio pelado no hay pantalla de acceso", async ({ page }) => {
  /**
   * `xulasigma.mx/acceso` sin municipio es 404, no 500. Un 500 delata que
   * ahi adentro hay algo que espera un tenant; un 404 no dice nada. Antes
   * de la guarda del layout, esto respondia 500 —lo encontro este E2E.
   */
  const respuesta = await page.goto("http://localhost:3000/acceso");

  expect(respuesta?.status()).toBe(404);
});

test("sin sesion, la raiz manda a la pantalla de acceso", async ({ page }) => {
  await page.goto(urlDe("motul"));

  await expect(page).toHaveURL(urlDe("motul", "/acceso"));
});

test("una clave incorrecta no entra y no dice por que", async ({ page }) => {
  await page.goto(urlDe("motul", "/acceso"));
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contrasenia").fill("clave-larga-y-equivocada");
  await page.getByRole("button", { name: "Entrar" }).click();

  // Acotado al formulario: Next monta su propio `role="alert"` para
  // anunciar cambios de ruta, y sin acotar el selector agarra los dos.
  const aviso = page.locator("form").getByRole("alert");

  await expect(aviso).toBeVisible();
  // Un mensaje distinto para "no existe" confirmaria que la cuenta existe.
  await expect(aviso).toHaveText("Correo o contrasenia incorrectos.");
  await expect(page).toHaveURL(urlDe("motul", "/acceso"));
});

test("la cookie de Motul no abre sesion en Ticul", async ({ page }) => {
  /**
   * El test que justifica el archivo. La misma persona, con el mismo correo
   * y la misma clave, existe en los dos municipios: si la cookie cruzara,
   * entrar en uno daria acceso al otro y el aislamiento seria decorativo
   * del lado del navegador aunque RLS lo sostenga del lado de la base.
   */
  await acceder(page, "motul");
  await expect(page).toHaveURL(urlDe("motul"));
  await expect(page.getByRole("heading")).toHaveText(MUNICIPIOS.motul.nombre);

  await page.goto(urlDe("ticul"));

  // Misma pestania, mismo almacen de cookies, otro municipio: afuera.
  await expect(page).toHaveURL(urlDe("ticul", "/acceso"));
});

test("las cookies quedan acotadas a su subdominio", async ({ page }) => {
  /**
   * El mecanismo, no solo el efecto. Si el test de arriba pasara porque la
   * cookie se llama distinto en cada municipio —y no porque su alcance las
   * separe— seguiria en verde el dia que alguien active
   * `crossSubDomainCookies`.
   */
  await acceder(page, "motul");
  await expect(page).toHaveURL(urlDe("motul"));

  const cookies = await page.context().cookies();
  const dominios = new Set(cookies.map((c) => c.domain));

  expect(dominios).not.toContain(".localhost");

  for (const cookie of cookies) {
    expect(cookie.domain).toContain(MUNICIPIOS.motul.subdominio);
  }
});
