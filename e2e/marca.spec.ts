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
  await liberarVentanaDeRitmo();
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
});
