import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * La pantalla de exportacion segun `design/exportacion/01` (S10-S13).
 *
 * Lo que se prueba es que el inventario y el archivo digan lo mismo: la lista
 * de la pantalla no es una copia a mano de los conjuntos, es la misma
 * composicion que arma el ZIP, y cada conteo es el numero de filas que el CSV
 * trae. Si alguien agrega una porcion y no la describe, este test la ve en el
 * ZIP y no en la pantalla.
 *
 * Requiere `unzip` en el PATH, igual que `exportacionDeDatos.spec.ts`.
 */

const FILAS = new Intl.NumberFormat("es-MX");

test.beforeEach(liberarVentanaDeRitmo);

type RenglonDelInventario = { archivo: string; texto: string };

const renglonesEnPantalla = async (
  page: Page,
): Promise<RenglonDelInventario[]> =>
  page.locator("[data-archivo]").evaluateAll((nodos) =>
    nodos.map((nodo) => ({
      archivo: nodo.getAttribute("data-archivo") ?? "",
      texto: nodo.textContent ?? "",
    })),
  );

const nombresDelZip = (ruta: string): string[] =>
  execFileSync("unzip", ["-Z1", ruta], { encoding: "utf8" })
    .split("\n")
    .map((nombre) => nombre.trim())
    .filter((nombre) => nombre !== "");

const manifiestoDe = (
  ruta: string,
): { conjuntos: { nombre: string; filas: number }[] } =>
  JSON.parse(
    execFileSync("unzip", ["-p", ruta, "manifiesto.json"], {
      encoding: "utf8",
    }),
  ) as { conjuntos: { nombre: string; filas: number }[] };

test("el inventario lista cada archivo del ZIP y sus filas, y el ZIP los lleva todos (S10, S11)", async ({
  page,
}, info) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/exportacion"));

  await expect(
    page.getByRole("heading", { name: "Exportación" }),
  ).toBeVisible();

  // S10: el aviso de datos del personal va antes que cualquier conteo.
  await expect(
    page.getByText("El archivo lleva datos del personal del ayuntamiento."),
  ).toBeVisible();
  await expect(page.getByText("datos del personal").first()).toBeVisible();

  const enPantalla = await renglonesEnPantalla(page);
  expect(enPantalla.map((renglon) => renglon.archivo)).toEqual(
    expect.arrayContaining(["usuarios.csv", "bitacora.csv", "personas.csv"]),
  );

  // El ZIP, con la sesion del navegador. No hace falta el evento de descarga
  // para leerlo, y el `unzip` de abajo necesita un archivo de verdad.
  const respuesta = await page.request.get(
    urlDe("motul", "/exportacion/descarga"),
  );
  expect(respuesta.status()).toBe(200);
  expect(respuesta.headers()["content-type"]).toBe("application/zip");

  const ruta = info.outputPath("motul-exportacion.zip");
  writeFileSync(ruta, await respuesta.body());

  const archivos = nombresDelZip(ruta);
  const manifiesto = manifiestoDe(ruta);
  const filasDelManifiesto = new Map(
    manifiesto.conjuntos.map((conjunto) => [
      `${conjunto.nombre}.csv`,
      conjunto.filas,
    ]),
  );

  // S10: la lista de la pantalla es la del ZIP, ni una mas ni una menos.
  expect(enPantalla.map((renglon) => renglon.archivo).sort()).toEqual(
    archivos.filter((archivo) => archivo.endsWith(".csv")).sort(),
  );
  expect(archivos).toContain("manifiesto.json");

  // Y el ZIP sigue completo: los dos que llevan datos del personal no se
  // recortan, aunque la pantalla los advierta.
  expect(archivos).toContain("usuarios.csv");
  expect(archivos).toContain("bitacora.csv");

  // S11: cada renglon dice las filas que su CSV trae de verdad.
  for (const renglon of enPantalla) {
    const filas = filasDelManifiesto.get(renglon.archivo);
    expect(
      filas,
      `${renglon.archivo} esta en la pantalla y no en el ZIP`,
    ).toBeDefined();
    expect(renglon.texto).toContain(FILAS.format(filas ?? 0));
  }
});

test("con JavaScript, al terminar la pantalla dice que se descargo y el nombre (S12)", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/exportacion"));

  await page
    .getByRole("link", { name: "Descargar los datos del ayuntamiento" })
    .click();

  const estado = page.getByRole("status").filter({ hasText: "Se descargó" });

  await expect(estado).toBeVisible();
  await expect(estado).toContainText(
    /^Se descargó motul-\d{4}-\d{2}-\d{2}\.zip \(\d+(\.\d)? (B|KB|MB)\)\./,
  );
});

test("si la descarga falla, el error queda dentro del panel (S13)", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/exportacion"));

  await page.route("**/exportacion/descarga", (ruta) =>
    ruta.fulfill({ status: 500, body: "" }),
  );

  await page
    .getByRole("link", { name: "Descargar los datos del ayuntamiento" })
    .click();

  const fallo = page.getByRole("alert");

  await expect(fallo).toContainText("No se pudo armar el archivo.");
  await expect(fallo).toContainText("No se descargó nada");
  // Sigue en la pantalla, con el inventario y el boton para reintentar.
  await expect(
    page.getByRole("link", { name: "Descargar los datos del ayuntamiento" }),
  ).toBeVisible();
  await expect(page.getByText("usuarios.csv").first()).toBeVisible();
});
