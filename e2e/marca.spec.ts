import { randomUUID } from "node:crypto";
import { type Browser, expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { altaDePersona } from "@/shared/auth/alta";
import { PALETA } from "@/shared/marca";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { ayuntamientos } from "@/shared/tenancy/esquema";
import { withTenant } from "@/shared/tenancy/withTenant";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { CLAVE, MUNICIPIOS, urlDe } from "./municipios";

/**
 * Solo caminos de validacion que fallan **antes** de cualquier PUT al
 * almacen de escudos: tamano, formato y archivo vacio. Un archivo que
 * pasara la validacion subiria un objeto a un bucket real, y este E2E no
 * tiene ninguno; por eso ningun caso manda un PNG valido.
 */

const UN_MIB = 1024 * 1024;
const correoDeOperador = `operador-${randomUUID()}@example.com`;

/** Un primario oscuro: el texto automatico que le toca es blanco. */
const HEX_LIBRE = "#123456";
/**
 * El texto que ve la operadora cuando el color no pasa la reja (S8). Va
 * escrito aca y no importado del modulo: lo que este test fija es el
 * mensaje, no la constante que lo guarda.
 */
const MENSAJE_DE_COLOR_INVALIDO =
  "El color elegido no deja leer el texto. Elija uno más claro u oscuro.";
const ORO = PALETA.find(({ nombre }) => nombre === "Oro")?.valor ?? "";
const AZUL = PALETA.find(({ nombre }) => nombre === "Azul")?.valor ?? "";
const motul = comoAyuntamientoId(MUNICIPIOS.motul.id);

/** El mismo valor que inyecta el layout en el `style` de la superficie. */
const primarioEnElPanel = (page: Page) =>
  page.evaluate(() => {
    const principal = document.querySelector("main");

    return principal
      ? getComputedStyle(principal).getPropertyValue("--primary").trim()
      : "sin main";
  });

/** El mismo valor, pero en la muestra de la isla cliente. */
const primarioEnLaMuestra = (page: Page) =>
  page.evaluate(() => {
    const muestra = document.querySelector('[data-muestra="colores"]');

    return muestra
      ? getComputedStyle(muestra).getPropertyValue("--primary").trim()
      : "sin muestra";
  });

/** La marca que el E2E sembro para Motul: el escudo y ningun color. */ const limpiarColores =
  () =>
    withTenant(motul, (tx) =>
      tx
        .update(ayuntamientos)
        .set({ marca: { ...MUNICIPIOS.motul.marca } })
        .where(eq(ayuntamientos.id, motul)),
    );

const marcaDeMotul = async (): Promise<Record<string, unknown>> => {
  const [fila] = await withTenant(motul, (tx) =>
    tx
      .select({ marca: ayuntamientos.marca })
      .from(ayuntamientos)
      .where(eq(ayuntamientos.id, motul)),
  );

  // `marca` es una columna `jsonb`, o sea `unknown` del lado de TypeScript.
  return (fila?.marca ?? {}) as Record<string, unknown>;
};

const grupoDelPrimario = (page: Page) =>
  page.getByRole("group", { name: "Color primario" });

/** La pastilla visible de una opcion: es lo que recibe el clic. */
const opcionDelPrimario = (page: Page, nombre: string) =>
  grupoDelPrimario(page).locator("label").filter({ hasText: nombre });

test.beforeAll(async () => {
  await withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre: "Operador de Motul",
      email: correoDeOperador,
      clave: CLAVE,
      rol: "OPERADOR",
    }),
  );
});

/**
 * Este spec entra una vez por test y la ventana de ritmo por correo es de
 * cinco intentos cada quince minutos: limpiarla una sola vez por archivo
 * dejaba al ultimo acceso sobre lo que gastaron los anteriores. Misma
 * forma que `titulos.spec.ts` y `sesion.spec.ts`.
 */
test.beforeEach(liberarVentanaDeRitmo);

/** Los colores son estado del municipio: cada test parte de la marca sembrada. */
test.beforeEach(limpiarColores);

const elegirArchivo = async (page: Page, bytes: number) => {
  await page
    .getByLabel("Escudo del ayuntamiento", { exact: true })
    .setInputFiles({
      name: "escudo.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(bytes),
    });
  await page.getByRole("button", { name: "Guardar escudo" }).click();
};

const abrirMarca = async (page: Page) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/marca"));
};

test("la pagina de marca muestra su ubicacion y no desborda en movil ni escritorio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirMarca(page);

  const dimensionesMoviles = await page.evaluate(() => ({
    anchoDocumento: document.documentElement.scrollWidth,
    anchoVentana: window.innerWidth,
  }));
  // Con dos formularios y la muestra, la pantalla ya es mas alta que un
  // telefono, y eso no es un defecto: lo que no puede pasar es que algo se
  // salga a lo ancho.
  expect
    .soft(
      dimensionesMoviles.anchoDocumento,
      `Desbordamiento horizontal a 390px: ${dimensionesMoviles.anchoDocumento}px de documento y ${dimensionesMoviles.anchoVentana}px de ventana`,
    )
    .toBeLessThanOrEqual(dimensionesMoviles.anchoVentana);

  // `/marca` es una pantalla de primer nivel: la migaja es solo para
  // pantallas anidadas (`PaginaDePanel`, antipatron 26 de AGENTS.md). La
  // ubicacion la dicen el titulo de la pagina y el enlace del municipio al
  // inicio; el modulo activo se marca en la barra inferior (ver el test
  // siguiente).
  const inicio = page.getByRole("link", {
    name: `${MUNICIPIOS.motul.nombre}, inicio`,
  });
  expect
    .soft(
      await page
        .getByRole("heading", {
          name: "Marca del ayuntamiento",
          exact: true,
        })
        .count(),
      "La pagina debe titularse con su ubicacion",
    )
    .toBe(1);
  expect
    .soft(await inicio.count(), "El encabezado debe llevar al inicio")
    .toBe(1);
  expect
    .soft(
      await inicio.getAttribute("href"),
      "El inicio debe enlazar a la raiz del panel",
    )
    .toBe("/");
  expect.soft(await page.locator("main").count()).toBe(1);

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(
    page.getByRole("heading", { name: "Marca del ayuntamiento" }),
  ).toBeVisible();
  const dimensionesDeEscritorio = await page.evaluate(() => ({
    anchoDocumento: document.documentElement.scrollWidth,
    anchoVentana: window.innerWidth,
  }));
  expect
    .soft(
      dimensionesDeEscritorio.anchoDocumento,
      "La pagina no debe desbordar horizontalmente en escritorio",
    )
    .toBeLessThanOrEqual(dimensionesDeEscritorio.anchoVentana);
});

/**
 * A 390px la barra inferior muestra cuatro destinos fijos y un `<details>`
 * "Más" con el resto, incluido `Marca` (el ultimo modulo). El modulo activo
 * no vive en una hilera desplazable: hay que abrir "Más" para verlo marcado
 * con `aria-current`, y al navegar en cliente `key={ruta}` vuelve a montarlo
 * cerrado.
 */
test("el modulo activo queda a la vista en la barra inferior a 390px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await accederAMotul(page);
  // La barra inferior vive en las pantallas del panel; el inicio (`/`) es la
  // landing de `(acceso)`, con su propia navegacion de modulos.
  await page.goto(urlDe("motul", "/padron"));

  const barra = page.getByRole("navigation", {
    name: "Navegación principal",
  });

  // Navegacion por clic y no goto: lo que se prueba es la marca del activo
  // cuando el panel navega en cliente.
  await barra.locator("summary").click();
  await barra.getByRole("link", { name: "Marca" }).click();
  await expect(page).toHaveURL(urlDe("motul", "/marca"));

  await barra.locator("summary").click();
  const activo = barra.getByRole("link", { name: "Marca" });
  await expect(activo).toHaveAttribute("aria-current", "page");

  await expect
    .poll(
      async () => {
        const caja = await activo.boundingBox();
        if (!caja) return "sin caja";

        const dentroDeLaVentana = caja.x >= 0 && caja.x + caja.width <= 390;

        return dentroDeLaVentana ? "visible" : `activo=${JSON.stringify(caja)}`;
      },
      {
        message: "El modulo activo debe quedar dentro de la ventana a 390px",
        timeout: 10_000,
      },
    )
    .toBe("visible");

  expect(
    await page.evaluate(() => window.scrollY),
    "Abrir Mas para ver el modulo activo no debe desplazar la pagina",
  ).toBe(0);
});

test("un archivo de mas de 1 MiB muestra el mensaje de peso, no falla mudo", async ({
  page,
}) => {
  const errores: string[] = [];
  page.on("pageerror", (error) => errores.push(error.message));
  await abrirMarca(page);

  await elegirArchivo(page, 1_200_000);

  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "El archivo pesa más de 1 MiB.",
  );
  await expect(
    page.getByRole("button", { name: "Guardar escudo" }),
  ).toBeEnabled();
  expect(errores).toEqual([]);
});

test("un archivo que cabe en 1 MiB pero no es PNG dice que no es PNG", async ({
  page,
}) => {
  await abrirMarca(page);

  await elegirArchivo(page, UN_MIB);

  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "El archivo no es un PNG válido.",
  );
});

test("un archivo vacio dice que esta vacio", async ({ page }) => {
  await abrirMarca(page);

  await elegirArchivo(page, 0);

  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "El archivo está vacío.",
  );
});

test("un archivo que ni el transporte admite muestra un error claro y no una promesa rechazada", async ({
  page,
}) => {
  const errores: string[] = [];
  page.on("pageerror", (error) => errores.push(error.message));
  await abrirMarca(page);

  await elegirArchivo(page, 5 * UN_MIB);

  await expect(page.locator("form").getByRole("alert")).toHaveText(
    "No se pudo subir el archivo. Intente de nuevo.",
  );
  await expect(
    page.getByRole("button", { name: "Guardar escudo" }),
  ).toBeEnabled();
  expect(errores).toEqual([]);
});

test("un OPERADOR ve el aviso de permiso y no el formulario", async ({
  page,
}) => {
  await accederAMotul(page, correoDeOperador);
  await page.goto(urlDe("motul", "/marca"));

  await expect(
    page.getByText("Su rol no tiene permiso para cambiar la marca"),
  ).toBeVisible();
  await expect(page.getByLabel("Escudo del ayuntamiento")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Marca del ayuntamiento",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
});

test("elegir un color de la paleta lo guarda y el panel lo pinta", async ({
  page,
}) => {
  await abrirMarca(page);

  // Se hace clic en la opcion visible, que es lo que hace una persona: el
  // radio vive recortado (`sr-only`) para que el objetivo tactil sea la
  // pastilla entera.
  await opcionDelPrimario(page, "Oro").click();

  // S4: la isla repinta la muestra al elegir, y solo la muestra — el panel
  // sigue con lo guardado hasta que la accion confirma.
  await expect.poll(() => primarioEnLaMuestra(page)).toBe(ORO);
  expect(await primarioEnElPanel(page)).not.toBe(ORO);

  await page.getByRole("button", { name: "Guardar colores" }).click();

  await expect(page).toHaveURL(/ok=colores-guardados/);
  await expect.poll(() => primarioEnElPanel(page)).toBe(ORO);
});

test("el selector exacto solo se ofrece con «Otro color» marcado", async ({
  page,
}) => {
  // El servidor lee el selector exacto solo con «Otro color» marcado: si
  // se pudiera tocar con un color de la paleta elegido, el guardado
  // ignoraria el color exacto y avisaria exito igual.
  await abrirMarca(page);
  const exacto = grupoDelPrimario(page).getByLabel("Elegir color primario");

  await opcionDelPrimario(page, "Oro").click();
  await expect(exacto).toBeHidden();

  await opcionDelPrimario(page, "Otro color").click();
  await expect(exacto).toBeVisible();
});

test("elegir un color libre se guarda tal cual y el panel lo pinta", async ({
  page,
}) => {
  await abrirMarca(page);

  await opcionDelPrimario(page, "Otro color").click();
  await grupoDelPrimario(page)
    .getByLabel("Elegir color primario")
    .fill(HEX_LIBRE);
  await page.getByRole("button", { name: "Guardar colores" }).click();

  await expect(page).toHaveURL(/ok=colores-guardados/);
  await expect.poll(() => primarioEnElPanel(page)).toBe(HEX_LIBRE);
});

test("restablecer borra los colores y conserva el escudo", async ({ page }) => {
  await abrirMarca(page);

  await opcionDelPrimario(page, "Oro").click();
  await page.getByRole("button", { name: "Guardar colores" }).click();
  await expect.poll(() => primarioEnElPanel(page)).toBe(ORO);

  await page.getByRole("button", { name: "Restablecer colores" }).click();

  await expect(page).toHaveURL(/ok=colores-restablecidos/);
  // Vacio: la marca ya no trae `primario` y `globals.css` vuelve al
  // fallback del design system (S5).
  await expect.poll(() => primarioEnElPanel(page)).toBe("");

  const marca = await marcaDeMotul();
  expect(marca.escudo).toBe(MUNICIPIOS.motul.marca.escudo);
  expect(marca.primario).toBeUndefined();
  expect(marca.secundario).toBeUndefined();
});

test("un color que la reja rechaza no se guarda y el panel no cambia", async ({
  page,
}) => {
  await abrirMarca(page);

  await opcionDelPrimario(page, "Otro color").click();

  // El selector del navegador solo puede producir `#rrggbb`, asi que el
  // caso que la reja del servidor ataja es justamente el que no pasa por
  // el selector: se escribe en el campo ya renderizado, sin tocar la
  // accion. Con el texto automatico, todo color medible alcanza 4.5:1
  // (blanco o negro, el que gane), asi que lo que la reja rechaza es un
  // valor que no es un color medible.
  await page.evaluate(() => {
    const campo = document.querySelector<HTMLInputElement>(
      'input[name="primarioLibre"]',
    );

    if (!campo) return;

    campo.type = "text";
    campo.value = "oklch(0.5)";
  });

  await page.getByRole("button", { name: "Guardar colores" }).click();

  await expect(page).toHaveURL(/error=/);
  // Dentro de `main`: el anunciador de ruta de Next tambien es `role="alert"`.
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    MENSAJE_DE_COLOR_INVALIDO,
  );
  expect(await primarioEnElPanel(page)).toBe("");
});

/** La sesion se abre con script; lo que se prueba despues corre sin el. */
const contextoSinJavaScript = async (browser: Browser) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  return browser.newContext({ javaScriptEnabled: false, storageState: estado });
};

test("sin JavaScript, elegir un color y guardarlo funciona igual", async ({
  browser,
}) => {
  const contexto = await contextoSinJavaScript(browser);

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/marca"));

    await opcionDelPrimario(page, "Azul").click();
    await page.getByRole("button", { name: "Guardar colores" }).click();

    await expect(page).toHaveURL(/ok=colores-guardados/);
    await expect.poll(() => primarioEnElPanel(page)).toBe(AZUL);
    expect((await marcaDeMotul()).primario).toBe(AZUL);
  } finally {
    await contexto.close();
  }
});
