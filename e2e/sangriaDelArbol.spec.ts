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
 * posiciones reales del asentamiento y su colonia y se compara el paso con
 * el padding propio de ambas filas. La tabla acumulada anterior usaba 16 px
 * en la raiz y 36 px en su hija, por lo que tampoco pasa esta comparacion.
 *
 * B2 deja solo dos niveles de negocio; inventar una manzana para medir un
 * tercer salto volveria a probar una jerarquia que el producto ya no admite.
 */
/**
 * Nombres fijos, y a proposito: `e2e/preparar.ts` trunca `bitacora` y
 * `ayuntamientos` al empezar **cada** corrida, asi que la base nunca trae
 * los lugares de la anterior. Sufijarlos con el reloj —lo primero que uno
 * escribe— haria que dos corridas del mismo codigo buscarán nombres distintos:
 * el test deja de ser reproducible y su fallo deja de ser comparable.
 */
const COMISARIA = "Comisaria Sangria E2E";
const COLONIA = "Colonia Sangria E2E";

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
  // Por rol y exacto: `getByLabel("Nombre")` tambien matchea el buscador del
  // arbol ("Buscar lugar por **nombre**"), que aparece cuando el municipio ya
  // tiene lugares —o sea, cuando otra spec sembro antes— y volvia el
  // localizador ambiguo.
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill(nombre);
  await page.getByRole("button", { name: "Dar de alta" }).click();
  // El POST nativo redirige a la vista del padre, donde el lugar nuevo ya
  // aparece. Esperarlo es determinista; `waitForLoadState("networkidle")` no
  // lo es —Playwright lo desaconseja—: mide que la red quede quieta, no que el
  // alta haya ocurrido.
  await expect(
    page.getByRole("link", { name: new RegExp(`^${nombre},`) }),
  ).toBeVisible();
}

/**
 * El `padding-left` renderizado por la fila que lleva ese nombre, buscado
 * **solo adentro de su propio `<li>`**.
 *
 * La busqueda no sube mas alla a proposito: trepar por los ancestros hasta
 * encontrar un padding encuentra el de cualquier contenedor de la pagina, y
 * entonces la asercion pasaria aunque la fila no pintara nada —justo la
 * regresion que este test existe para atrapar—. Sin padding propio devuelve
 * -1, y el test lo dice.
 */
async function sangriaPintada(page: Page, nombre: string) {
  return page.evaluate((n) => {
    const fila = document
      .querySelector(`main a[aria-label^="${n}"]`)
      ?.closest("li");

    if (!fila) return -1;

    const conSangria = [
      fila,
      ...fila.querySelectorAll(":scope > span, :scope > div"),
    ].find((el) => Number.parseFloat(getComputedStyle(el).paddingLeft) > 0);

    return conSangria
      ? Number.parseFloat(getComputedStyle(conSangria).paddingLeft)
      : -1;
  }, nombre);
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
  await page
    .getByRole("textbox", { name: "Nombre", exact: true })
    .fill(COMISARIA);
  await page.getByRole("button", { name: "Dar de alta" }).click();
  await expect(
    page.getByRole("link", { name: new RegExp(`^${COMISARIA},`) }),
  ).toBeVisible();

  await page.getByRole("link", { name: new RegExp(`^${COMISARIA},`) }).click();
  await darDeAlta(page, { tipo: "colonia", nombre: COLONIA });

  await page.getByRole("link", { name: new RegExp(`^${COLONIA},`) }).click();
  await expect(
    page.getByRole("link", { name: "Agregar lugar", exact: true }),
  ).toHaveCount(0);

  await page.goto(urlDe("motul", "/territorio"));

  const comisaria = await izquierdaDe(page, COMISARIA);
  const colonia = await izquierdaDe(page, COLONIA);
  const primerPaso = colonia - comisaria;

  expect(primerPaso).toBeGreaterThan(0);
  // El paso geometrico tiene que ser el mismo que pinta la clase de la fila:
  // asi el numero es la sangria real de un nivel y no un tope elegido a ojo.
  const sangria = await sangriaPintada(page, COMISARIA);

  expect(sangria, "la fila deberia pintar su propia sangria").toBeGreaterThan(
    0,
  );
  expect(Math.round(primerPaso)).toBe(Math.round(sangria));
  expect(Math.round(await sangriaPintada(page, COLONIA))).toBe(
    Math.round(sangria),
  );
});
