import { expect, type Page, test } from "@playwright/test";
import postgres from "postgres";
import { CLAVE, CORREO, urlDe } from "./municipios";

/**
 * La sangria del arbol se mide, no se busca en el marcado.
 *
 * `src/modules/territorio/ui/sangriaDelArbol.test.tsx` afirma sobre las clases
 * que pinta el componente, y eso no alcanza: una fila puede volver a sumar la
 * sangria de sus ancestros por cualquier otro camino —un margen, un `padding`
 * del padre, un `transform`— y el marcado queda igual. Aca se comparan las
 * posiciones reales de tres niveles y se exige el mismo paso entre uno y otro,
 * que es el invariante que el arreglo de `R3-cumulative-tree-indentation`
 * protege. Con la tabla de posiciones acumuladas que habia antes los saltos
 * eran 16, 36 y 56 px, asi que este test se ponia rojo.
 *
 * El arbol se arma por la interfaz: comisaria, colonia y manzana, la jerarquia
 * que permite `puedeContener` (rango estrictamente creciente).
 */
const COMISARIA = "Comisaria Sangria E2E";
const COLONIA = "Colonia Sangria E2E";
const MANZANA = "Manzana Sangria E2E";

test.beforeAll(async () => {
  const url = process.env.MIGRATION_DATABASE_URL;

  if (!url) throw new Error("Falta MIGRATION_DATABASE_URL para el E2E.");

  const owner = postgres(url, { max: 1 });

  try {
    await owner`TRUNCATE intentos_acceso`;
  } finally {
    await owner.end();
  }
});

/**
 * Mismo reintento que `bajaDeLugar.spec.ts`, duplicado a proposito: el
 * limitador de accesos de Better Auth vive en memoria del proceso y los specs
 * anteriores de la corrida ya accedieron con este mismo correo.
 */
async function acceder(page: Page) {
  for (let intento = 0; intento < 5; intento++) {
    await page.goto(urlDe("motul", "/acceso"));

    if (page.url() === urlDe("motul")) return;

    await page.getByLabel("Correo").fill(CORREO);
    await page.getByLabel("Contraseña").fill(CLAVE);
    await page.getByRole("button", { name: "Entrar" }).click();

    try {
      await page.waitForURL(urlDe("motul"), { timeout: 5_000 });
      return;
    } catch {
      await page.waitForTimeout(5_000);
    }
  }

  throw new Error("No se pudo acceder: la ventana de ritmo no se libero.");
}

/** Da de alta un lugar con el formulario nativo y espera el re-render. */
async function darDeAlta(
  page: Page,
  { tipo, nombre }: { tipo: string; nombre: string },
) {
  await page.getByRole("link", { name: "Agregar lugar" }).click();
  await page.getByLabel("Tipo").selectOption(tipo);
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Dar de alta" }).click();
  await page.waitForLoadState("networkidle");
}

/** La izquierda del nombre de una fila, en px. */
async function izquierdaDe(page: Page, nombre: string) {
  const caja = await page
    .getByRole("link", { name: new RegExp(`^${nombre},`) })
    .first()
    .boundingBox();

  expect(caja, `${nombre} deberia estar visible`).not.toBeNull();

  return caja?.x ?? 0;
}

test("la sangria del arbol es el mismo paso en cada nivel", async ({
  page,
}) => {
  await acceder(page);

  await page.goto(urlDe("motul", "/territorio?accion=lugar"));
  await page.getByLabel("Tipo").selectOption("comisaria");
  await page.getByLabel("Nombre").fill(COMISARIA);
  await page.getByRole("button", { name: "Dar de alta" }).click();
  await page.waitForLoadState("networkidle");

  await page.goto(urlDe("motul", "/territorio"));
  await page.getByRole("link", { name: new RegExp(`^${COMISARIA},`) }).click();
  await darDeAlta(page, { tipo: "colonia", nombre: COLONIA });

  await page.getByRole("link", { name: new RegExp(`^${COLONIA},`) }).click();
  await darDeAlta(page, { tipo: "manzana", nombre: MANZANA });

  await page.goto(urlDe("motul", "/territorio"));
  // La rama del nivel 1 nace plegada: se abre para que la manzana se vea.
  await page
    .locator(
      `summary[aria-label="Mostrar u ocultar el contenido de ${COLONIA}"]`,
    )
    .click();

  const comisaria = await izquierdaDe(page, COMISARIA);
  const colonia = await izquierdaDe(page, COLONIA);
  const manzana = await izquierdaDe(page, MANZANA);

  const primerPaso = colonia - comisaria;
  const segundoPaso = manzana - colonia;

  expect(primerPaso).toBeGreaterThan(0);
  expect(Math.abs(primerPaso - segundoPaso)).toBeLessThanOrEqual(1);
  // Un paso chico: el arbol se abre en abanico cuando crece con la profundidad.
  expect(primerPaso).toBeLessThanOrEqual(24);
});
