import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { altaDePersona } from "@/shared/auth/alta";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { ayuntamientos } from "@/shared/tenancy/esquema";
import { withTenant } from "@/shared/tenancy/withTenant";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { CLAVE, MUNICIPIOS, urlDe } from "./municipios";

/**
 * La exportacion completa (S1): el administrador entra, descarga y el
 * archivo que recibe es un ZIP que abre, con el manifiesto y los datos de su
 * municipio; el operador no ve ni la pantalla ni la entrada del panel.
 *
 * El escudo se deja fuera en este E2E: `MUNICIPIOS.motul.marca.escudo`
 * apunta a una URL de la propia aplicacion, que no es del almacenamiento de
 * objetos, y la descarga falla a proposito cuando el escudo guardado no se
 * puede leer (S4). No hay bucket en CI. El escudo con bytes reales lo cubren
 * `route.integration.test.ts` y `descargaDeDatos.test.ts` con el puerto
 * falso; aca se prueba el camino sin escudo, que es un municipio real.
 */

const motul = comoAyuntamientoId(MUNICIPIOS.motul.id);
const correoDelOperador = `operador-${randomUUID()}@example.com`;

const escribirMarca = (marca: Record<string, unknown>) =>
  withTenant(motul, (tx) =>
    tx.update(ayuntamientos).set({ marca }).where(eq(ayuntamientos.id, motul)),
  );

test.beforeAll(async () => {
  await escribirMarca({});
  await withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre: "Operador de Motul",
      email: correoDelOperador,
      clave: CLAVE,
      rol: "OPERADOR",
    }),
  );
});

test.afterAll(async () => {
  await escribirMarca(MUNICIPIOS.motul.marca);
});

/** Limpia la ventana de ritmo del acceso: un `POST` por test, y son cinco. */
test.beforeEach(liberarVentanaDeRitmo);

test("el administrador descarga el ZIP y adentro estan el manifiesto y las personas", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/exportacion"));

  await expect(
    page.getByRole("heading", { name: "Exportación" }),
  ).toBeVisible();

  const [descarga] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("link", { name: "Descargar los datos del ayuntamiento" })
      .click(),
  ]);

  const ruta = await descarga.path();
  if (!ruta) throw new Error("La descarga no dejó un archivo.");

  expect(descarga.suggestedFilename()).toMatch(
    /^motul-\d{4}-\d{2}-\d{2}\.zip$/,
  );

  expect(execFileSync("unzip", ["-t", ruta], { encoding: "utf8" })).toContain(
    "No errors detected",
  );

  const listado = execFileSync("unzip", ["-l", ruta], { encoding: "utf8" });

  expect(listado).toContain("manifiesto.json");
  expect(listado).toContain("personas.csv");

  const manifiesto = JSON.parse(
    execFileSync("unzip", ["-p", ruta, "manifiesto.json"], {
      encoding: "utf8",
    }),
  ) as { subdominio: string; conjuntos: { nombre: string }[] };

  // El archivo que se lleva es el de Motul y no el de otro municipio.
  expect(manifiesto.subdominio).toBe(MUNICIPIOS.motul.subdominio);
  expect(manifiesto.conjuntos.map((conjunto) => conjunto.nombre)).toContain(
    "usuarios",
  );
});

test("el operador no ve la pantalla ni la entrada del panel", async ({
  page,
}) => {
  await accederAMotul(page, correoDelOperador);
  await page.goto(urlDe("motul", "/exportacion"));

  await expect(
    page.getByText(
      "Su rol no tiene permiso para exportar los datos del ayuntamiento.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Descargar los datos del ayuntamiento" }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Exportación" })).toHaveCount(0);
});
