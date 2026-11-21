import { type Browser, expect, type Page, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * S6, S8 y S9 del escudo.
 *
 * El hallazgo E1: el formulario era una hoja cliente que armaba el
 * `FormData` en un `onSubmit`. Sin JavaScript, el envio caia en un `GET
 * /marca?escudo=...` sin archivo y sin mensaje: la operadora no sabia que
 * habia fallado. Ahora es un `<form action>` nativo en
 * `multipart/form-data` y el rechazo vuelve por `redirect` con un codigo que
 * la pagina traduce, asi que el mensaje tiene que ser **el mismo** con y sin
 * JavaScript.
 *
 * Nada de aca sube un escudo: el E2E no tiene bucket, y un archivo valido
 * llegaria al PUT. Los tres casos son rechazos que la accion resuelve antes
 * de tocar el almacen.
 */

/**
 * Los textos van escritos y no importados del modulo: lo que este test fija
 * es el mensaje que lee la operadora, no la constante que lo guarda.
 */
const MENSAJE_DE_PESO = "El archivo pesa más de 1 MiB.";
const MENSAJE_DE_NO_PNG = "El archivo no es un PNG válido.";
const REQUISITOS =
  "Archivo PNG de hasta 1 MiB, entre 80x80 y 2048x2048 píxeles.";

/** La sesion se abre con script; lo que se prueba despues corre sin el. */
const contextoSinJavaScript = async (browser: Browser) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  return browser.newContext({ javaScriptEnabled: false, storageState: estado });
};

/** Desde T4 el campo se llama como lo que hace: la fila ya se titula Escudo. */
const campoDeEscudo = (page: Page) =>
  page.getByLabel("Cambiar el escudo", { exact: true });

const elegirArchivo = async (
  page: Page,
  bytes: number,
  nombre = "escudo.png",
) =>
  campoDeEscudo(page).setInputFiles({
    name: nombre,
    mimeType: "image/png",
    buffer: Buffer.alloc(bytes),
  });

const enviar = (page: Page) =>
  page.getByRole("button", { name: "Guardar escudo" }).click();

/** El error del archivo, que vive dentro del formulario junto al campo. */
const errorDelCampo = (page: Page) =>
  page.locator("form").getByText(MENSAJE_DE_NO_PNG);

test.beforeEach(liberarVentanaDeRitmo);

test("sin JavaScript, los requisitos se leen antes de elegir el archivo", async ({
  browser,
}) => {
  const contexto = await contextoSinJavaScript(browser);

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/marca"));

    await expect(page.getByText(REQUISITOS, { exact: true })).toBeVisible();
    // Asociados al campo: quien navega con lector de pantalla los escucha al
    // enfocarlo, y quien no lo usa los tiene a la vista antes de elegir.
    await expect(campoDeEscudo(page)).toHaveAccessibleDescription(REQUISITOS);
  } finally {
    await contexto.close();
  }
});

test("sin JavaScript, un archivo que no es PNG dice lo mismo que con JavaScript", async ({
  browser,
}) => {
  const contexto = await contextoSinJavaScript(browser);

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/marca"));

    await elegirArchivo(page, 3);
    await enviar(page);

    // El POST nativo vuelve con el codigo del rechazo en la URL y la pagina
    // lo traduce: ni texto de excepcion ni pagina en blanco.
    await expect(page).toHaveURL(/error=escudo-no-png/);
    await expect(errorDelCampo(page)).toBeVisible();
    await expect(campoDeEscudo(page)).toHaveAttribute("aria-invalid", "true");
  } finally {
    await contexto.close();
  }
});

test("el archivo rechazado no queda elegido", async ({ browser }) => {
  const contexto = await contextoSinJavaScript(browser);

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/marca"));

    await elegirArchivo(page, 3);
    await enviar(page);

    await expect(errorDelCampo(page)).toBeVisible();
    // La respuesta es una navegacion nueva: el campo vuelve vacio, asi que
    // "Guardar escudo" no reenvia el archivo que el servidor ya rechazo.
    await expect(campoDeEscudo(page)).toHaveValue("");
    expect(
      await campoDeEscudo(page).evaluate((campo) => {
        const archivo = campo as HTMLInputElement;

        return archivo.files?.length ?? 0;
      }),
    ).toBe(0);
  } finally {
    await contexto.close();
  }
});

test("sin JavaScript, un archivo de mas de 1 MiB dice el peso", async ({
  browser,
}) => {
  const contexto = await contextoSinJavaScript(browser);

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/marca"));

    await elegirArchivo(page, 1_200_000);
    await enviar(page);

    await expect(page).toHaveURL(/error=escudo-pesado/);
    await expect(page.locator("form").getByText(MENSAJE_DE_PESO)).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("con JavaScript, el mismo rechazo dice lo mismo y cae junto al campo", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/marca"));

  await elegirArchivo(page, 3);
  await enviar(page);

  await expect(page).toHaveURL(/error=escudo-no-png/);
  await expect(errorDelCampo(page)).toBeVisible();
  // El boton vuelve habilitado: el rechazo es una respuesta del servidor,
  // no un estado de "subiendo" que se quedo pegado.
  await expect(
    page.getByRole("button", { name: "Guardar escudo" }),
  ).toBeEnabled();
});

/**
 * Queda un caso sin resolver, y no es de esta pantalla: **sin JavaScript** un
 * archivo de mas de 2 MB ni llega a la accion, porque Next corta el cuerpo de
 * una Server Action en su limite de transporte (2 MB, `next.config.ts`) antes
 * de invocarla, y la respuesta es la pagina del framework —«Internal Server
 * Error», en ingles— porque no hay render de la aplicacion que un
 * `error.tsx` pueda interceptar (medido: el limite
 * `src/app/(panel)/marca/error.tsx` no la alcanza). Con JavaScript lo
 * descarta el campo (`CampoDeArchivoDeEscudo`) con la oracion del catalogo.
 * Arreglarlo pide subir `serverActions.bodySizeLimit` o mover el transporte
 * del escudo a un Route Handler: las dos cosas cambian decisiones de
 * arquitectura y estan fuera de este archivo.
 */
