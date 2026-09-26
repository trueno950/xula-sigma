import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { altaDePersona } from "@/shared/auth/alta";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
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

  try {
    await withTenant(motul, (tx) =>
      altaDePersona(tx, motul, {
        nombre: "Operador de Motul",
        email: correoDeOperador,
        clave: CLAVE,
        rol: "OPERADOR",
      }),
    );
  } finally {
    await cerrarConexion();
  }
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

test("la pagina de marca muestra su ruta y no desborda en movil ni escritorio", async ({
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

  const migaja = page.getByRole("navigation", { name: "Ruta" });
  expect.soft(await migaja.count(), "La pagina debe mostrar la migaja").toBe(1);
  expect
    .soft(
      await migaja.getByRole("link", { name: "Inicio" }).getAttribute("href"),
      "Inicio debe enlazar a la raiz del panel",
    )
    .toBe("/");
  expect
    .soft(
      await migaja
        .getByText("Escudo del ayuntamiento", { exact: true })
        .getAttribute("aria-current"),
      "El escudo del ayuntamiento debe ser el paso actual",
    )
    .toBe("page");
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
 * El modulo activo es el ultimo de la lista (`Marca`) y a 390px arranca
 * fuera del tramo visible de la hilera: si la fila no se desplaza hasta el,
 * el operador no ve donde esta parado.
 */
test("la fila movil deja a la vista el modulo activo a 390px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirMarca(page);

  const fila = page.getByRole("navigation", { name: "Módulos" });
  const activo = fila.getByRole("link", { name: "Marca" });

  await expect(activo).toHaveAttribute("aria-current", "page");

  await expect
    .poll(
      async () => {
        const cajaDeLaFila = await fila.boundingBox();
        const cajaDelActivo = await activo.boundingBox();
        if (!cajaDeLaFila || !cajaDelActivo) return "sin caja";

        const dentroDeLaFila =
          cajaDelActivo.x >= cajaDeLaFila.x &&
          cajaDelActivo.x + cajaDelActivo.width <=
            cajaDeLaFila.x + cajaDeLaFila.width;
        const dentroDeLaVentana =
          cajaDelActivo.x >= 0 && cajaDelActivo.x + cajaDelActivo.width <= 390;

        return dentroDeLaFila && dentroDeLaVentana
          ? "visible"
          : `fila=${JSON.stringify(cajaDeLaFila)} activo=${JSON.stringify(cajaDelActivo)}`;
      },
      {
        message:
          "El modulo activo debe quedar dentro del tramo visible de la hilera",
        timeout: 10_000,
      },
    )
    .toBe("visible");

  expect(
    await page.evaluate(() => window.scrollY),
    "El ajuste del modulo activo no debe desplazar la pagina en vertical",
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
  await expect(page.getByRole("navigation", { name: "Ruta" })).toContainText(
    "Inicio",
  );
  await expect(page.locator("main")).toHaveCount(1);
});

test("un OPERADOR ve el aviso del bloque de firma en constancias", async ({
  page,
}) => {
  await accederAMotul(page, correoDeOperador);
  await page.goto(urlDe("motul", "/constancias"));

  const aviso = page.getByText(
    "Su rol no permite gestionar el bloque de firma de las constancias. Se requiere el rol de administrador municipal.",
    { exact: true },
  );

  await expect(aviso).toBeVisible();
  await expect(aviso).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Bloque de firma" })).toHaveCount(
    0,
  );
});
