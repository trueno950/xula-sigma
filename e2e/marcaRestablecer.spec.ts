import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { PALETA } from "@/shared/marca";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { ayuntamientos } from "@/shared/tenancy/esquema";
import { withTenant } from "@/shared/tenancy/withTenant";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S2 y S4 de `/marca`.
 *
 * S2: restablecer es una seccion con titulo, dice que colores se pierden y
 * pide una confirmacion que el servidor exige; sin ella no cambia nada.
 *
 * S4: los avisos de la pantalla no pintan texto que venga en la URL. El caso
 * de la auditoria fue `?error=Su cuenta será suspendida…`, que aparecia en el
 * aviso rojo del sistema como si lo hubiera escrito la aplicacion.
 *
 * La base del E2E es `xula_test`, la de la siembra de `e2e/preparar.ts`: no
 * se toca el demo. `limpiarColores` devuelve el municipio a su marca sembrada
 * en cada test, porque el estado de los colores es del municipio entero.
 */

const ORO = PALETA.find(({ nombre }) => nombre === "Oro")?.valor ?? "";
const motul = comoAyuntamientoId(MUNICIPIOS.motul.id);

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

const limpiarColores = () =>
  withTenant(motul, (tx) =>
    tx
      .update(ayuntamientos)
      .set({ marca: { ...MUNICIPIOS.motul.marca } })
      .where(eq(ayuntamientos.id, motul)),
  );

const abrirMarca = async (page: Page) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/marca"));
};

/** El cuerpo de una fila cerrada no es visible: hay que abrirla (T4). */
const abrirFila = async (page: Page, titulo: string) => {
  const fila = page
    .locator("details")
    .filter({ has: page.getByRole("heading", { name: titulo }) });

  if (await fila.evaluate((nodo) => (nodo as HTMLDetailsElement).open)) return;

  await fila.locator("summary").click();
};

const abrirColores = (page: Page) => abrirFila(page, "Colores del municipio");

/**
 * La fila plegable de «Restablecer colores» (T4). Es un `<details name>`
 * nativo: el cuerpo no es visible hasta abrirla, y el titulo —que es su `h2`—
 * se lee con la fila cerrada.
 */
const seccionDeRestablecer = (page: Page) =>
  page.locator("details").filter({
    has: page.getByRole("heading", { name: "Restablecer colores" }),
  });

const abrirRestablecer = async (page: Page) => {
  const fila = seccionDeRestablecer(page);
  const abierta = await fila.evaluate(
    (nodo) => (nodo as HTMLDetailsElement).open,
  );

  if (!abierta) await fila.locator("summary").click();
};

const casilla = (page: Page) =>
  seccionDeRestablecer(page).getByRole("checkbox", { name: /Confirmo/ });

const botonDeRestablecer = (page: Page) =>
  seccionDeRestablecer(page).getByRole("button", {
    name: "Restablecer colores",
  });

/** Deja al municipio con un color elegido, para ver si restablecer lo toca. */
const elegirOro = async (page: Page) => {
  await abrirColores(page);
  await page
    .getByRole("group", { name: "Color primario" })
    .locator("label")
    .filter({ hasText: "Oro" })
    .click();
  await page.getByRole("button", { name: "Guardar colores" }).click();
  await expect(page).toHaveURL(/ok=colores-guardados/);
  expect((await marcaDeMotul()).primario).toBe(ORO);
};

test.beforeEach(liberarVentanaDeRitmo);

test.beforeEach(limpiarColores);

test("restablecer es una seccion con titulo que dice que colores se pierden", async ({
  page,
}) => {
  await abrirMarca(page);
  await abrirRestablecer(page);

  await expect(
    page.getByRole("heading", { name: "Restablecer colores" }),
  ).toBeVisible();
  await expect(seccionDeRestablecer(page)).toContainText("color primario");
  await expect(seccionDeRestablecer(page)).toContainText("color de acento");
  await expect(seccionDeRestablecer(page)).toContainText(
    "El escudo del ayuntamiento no se toca.",
  );
  await expect(casilla(page)).not.toBeChecked();
});

test("sin la casilla el servidor no restablece nada", async ({ page }) => {
  await abrirMarca(page);
  await elegirOro(page);
  await abrirRestablecer(page);

  // Un POST a mano no trae la casilla: el `required` es del navegador y el
  // servidor lo vuelve a exigir. Se quita el atributo para hablarle a la
  // accion, que es lo que haria un formulario armado a mano.
  await casilla(page).evaluate((nodo) => nodo.removeAttribute("required"));
  await botonDeRestablecer(page).click();

  await expect(page).toHaveURL(/error=restablecimiento-sin-confirmar/);
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    "Para restablecer los colores, marque la casilla de confirmación.",
  );
  expect((await marcaDeMotul()).primario).toBe(ORO);
});

test("con la casilla el municipio vuelve a sus colores y conserva el escudo", async ({
  page,
}) => {
  await abrirMarca(page);
  await elegirOro(page);
  await abrirRestablecer(page);

  await casilla(page).check();
  await botonDeRestablecer(page).click();

  await expect(page).toHaveURL(/ok=colores-restablecidos/);
  const marca = await marcaDeMotul();
  expect(marca.primario).toBeUndefined();
  expect(marca.secundario).toBeUndefined();
  expect(marca.escudo).toBe(MUNICIPIOS.motul.marca.escudo);
});

test("un ?error= escrito a mano no pinta texto en el aviso", async ({
  page,
}) => {
  await abrirMarca(page);

  await page.goto(
    urlDe(
      "motul",
      `/marca?error=${encodeURIComponent("Su cuenta será suspendida en 24 horas.")}`,
    ),
  );

  // Nada del texto de la URL aparece: no es un codigo del catalogo, asi que
  // la pantalla no tiene oracion que poner.
  await expect(
    page.getByText("Su cuenta será suspendida en 24 horas."),
  ).toHaveCount(0);
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
});

test("sin JavaScript, restablecer tambien exige la casilla", async ({
  browser,
}) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  const contexto: BrowserContext = await browser.newContext({
    javaScriptEnabled: false,
    storageState: estado,
  });

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/marca"));
    await abrirRestablecer(page);

    await casilla(page).check();
    await botonDeRestablecer(page).click();

    // Con la casilla, el POST nativo restablece igual: la pagina vuelve
    // pintada por el `redirect` de la accion.
    await expect(page).toHaveURL(/ok=colores-restablecidos/);
    expect((await marcaDeMotul()).primario).toBeUndefined();
  } finally {
    await contexto.close();
  }
});
