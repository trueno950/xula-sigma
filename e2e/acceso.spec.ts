import { expect, test } from "@playwright/test";
import { CLAVE, CORREO, MUNICIPIOS, urlDe, urlDeLaRaiz } from "./municipios";

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
  await page.getByLabel("Contraseña").fill(CLAVE);
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
   * El dominio base sin municipio: `/acceso` ahi es 404, no 500. Un 500 delata que
   * ahi adentro hay algo que espera un tenant; un 404 no dice nada. Antes
   * de la guarda del layout, esto respondia 500 —lo encontro este E2E.
   */
  const respuesta = await page.goto(urlDeLaRaiz("/acceso"));

  expect(respuesta?.status()).toBe(404);
});

test("sin sesion, la raiz manda a la pantalla de acceso", async ({ page }) => {
  await page.goto(urlDe("motul"));

  await expect(page).toHaveURL(urlDe("motul", "/acceso"));
});

test("una clave incorrecta no entra y no dice por que", async ({ page }) => {
  await page.goto(urlDe("motul", "/acceso"));
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contraseña").fill("clave-larga-y-equivocada");
  await page.getByRole("button", { name: "Entrar" }).click();

  // Acotado al formulario: Next monta su propio `role="alert"` para
  // anunciar cambios de ruta, y sin acotar el selector agarra los dos.
  const aviso = page.locator("form").getByRole("alert");

  await expect(aviso).toBeVisible();
  // Un mensaje distinto para "no existe" confirmaria que la cuenta existe.
  await expect(aviso).toHaveText("Correo o contraseña incorrectos.");
  await expect(page).toHaveURL(urlDe("motul", "/acceso"));
});

test("un rechazo anterior no convive con el error de validacion nuevo", async ({
  page,
}) => {
  // El rechazo se simula en el borde: cada intento real cuenta contra la
  // ventana de ritmo del correo, y los tests de abajo necesitan la suya.
  await page.route("**/api/auth/sign-in/email", (ruta) =>
    ruta.fulfill({ status: 401, json: {} }),
  );
  await page.goto(urlDe("motul", "/acceso"));
  // El boton se habilita al hidratar: antes de eso el envio es el nativo.
  await expect(page.getByRole("button", { name: "Entrar" })).toBeEnabled();
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contraseña").fill("clave-larga-y-equivocada");
  await page.getByRole("button", { name: "Entrar" }).click();

  const aviso = page.locator("form").getByRole("alert");
  await expect(aviso).toHaveText("Correo o contraseña incorrectos.");

  await page.getByLabel("Contraseña").fill("corta");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(
    page.getByText("La contraseña es demasiado corta."),
  ).toBeVisible();
  await expect(aviso).toHaveCount(0);
});

/**
 * Lo que una peticion de navegacion tendria en la URL si el formulario
 * enviara por GET: el correo y la clave como parametros.
 */
const filtraLaClave = (url: string) =>
  url.includes(CLAVE) || url.includes(encodeURIComponent(CORREO));

test("sin JavaScript, Enter no envia el formulario de acceso", async ({
  browser,
}) => {
  /**
   * La ventana previa a la hidratacion, reproducida apagando el JS. El
   * boton deshabilitado impide el envio implicito por Enter, asi que el
   * formulario no navega a ningun lado: la asercion es que **no hubo
   * peticion de navegacion**, no que la URL no tenga la clave (que se
   * cumple tambien cuando el formulario esta roto y no navega).
   */
  const contexto = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexto.newPage();

  await page.goto(urlDe("motul", "/acceso"));
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contraseña").fill(CLAVE);

  const navegacion = page
    .waitForRequest((peticion) => peticion.isNavigationRequest(), {
      timeout: 1_000,
    })
    .catch(() => null);
  await page.getByLabel("Contraseña").press("Enter");

  expect(await navegacion).toBeNull();
  expect(page.url()).toBe(urlDe("motul", "/acceso"));
  await contexto.close();
});

test("un envio nativo antes de hidratar nunca lleva la clave en la URL", async ({
  browser,
}) => {
  /**
   * `requestSubmit()` esquiva el boton deshabilitado: es lo que queda si
   * alguien lo habilita o el navegador envia por otra via. Sin scripts de
   * la app el formulario no esta enganchado, asi que el envio es el nativo;
   * sin `method="post"` seria un GET a `/acceso?email=...&password=...`.
   */
  const contexto = await browser.newContext();
  await contexto.route("**/_next/static/**/*.js", (ruta) => ruta.abort());
  const page = await contexto.newPage();
  const urls: string[] = [];
  page.on("request", (peticion) => urls.push(peticion.url()));

  await page.goto(urlDe("motul", "/acceso"));
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contraseña").fill(CLAVE);

  const navegacion = page.waitForRequest(
    (peticion) => peticion.isNavigationRequest(),
    { timeout: 5_000 },
  );
  await page
    .locator("form")
    .evaluate((formulario) => (formulario as HTMLFormElement).requestSubmit());
  const enviada = await navegacion;

  expect(enviada.method()).toBe("POST");
  expect(urls.filter(filtraLaClave)).toEqual([]);
  await contexto.close();
});

test("los campos del acceso muestran un anillo de foco de 2px", async ({
  page,
}) => {
  await page.goto(urlDe("motul", "/acceso"));

  for (const etiqueta of ["Correo", "Contraseña"]) {
    const campo = page.getByLabel(etiqueta);

    // `focus()` y no `Tab`: el orden de tabulacion no es lo que se prueba.
    await campo.focus();
    await expect(campo).toBeFocused();
    await expect(campo).toHaveCSS("outline-style", "solid");
    await expect(campo).toHaveCSS("outline-width", "2px");
  }
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
