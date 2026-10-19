import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { altaDePersona } from "@/shared/auth/alta";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
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

test.beforeAll(async () => {
  const motul = comoAyuntamientoId(MUNICIPIOS.motul.id);

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
    altoDocumento: document.documentElement.scrollHeight,
    altoVentana: window.innerHeight,
  }));
  expect
    .soft(
      dimensionesMoviles.altoDocumento,
      `Desbordamiento vertical a 390px: ${dimensionesMoviles.altoDocumento}px de documento y ${dimensionesMoviles.altoVentana}px de ventana`,
    )
    .toBeLessThanOrEqual(dimensionesMoviles.altoVentana);

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
          name: "Escudo del ayuntamiento",
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
    page.getByRole("heading", { name: "Escudo del ayuntamiento" }),
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
      name: "Escudo del ayuntamiento",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveCount(1);
});
