import { type Browser, expect, type Page, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { comoAyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { ayuntamientos } from "@/shared/tenancy/esquema";
import { withTenant } from "@/shared/tenancy/withTenant";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S7: la pantalla muestra el escudo actual —o «Sin escudo»— y permite
 * quitarlo, con confirmacion.
 *
 * La base del E2E es `xula_test`, la de la siembra de `e2e/preparar.ts`: no se
 * toca el demo. `restaurarMarca` devuelve el municipio a su marca sembrada en
 * cada test —el escudo es de la fila del ayuntamiento y la banda del panel lo
 * pinta en todas las pantallas—.
 *
 * Nada de aca sube un escudo: el E2E no tiene bucket. Quitar si pasa por el
 * caso de uso completo; el borrado del objeto es best-effort y el adaptador
 * de R2 no esta configurado aca, asi que lo que este spec verifica es la
 * referencia de la fila y la pantalla.
 */

const motul = comoAyuntamientoId(MUNICIPIOS.motul.id);
const ESCUDO_SEMBRADO = MUNICIPIOS.motul.marca.escudo;

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

const restaurarMarca = () =>
  withTenant(motul, (tx) =>
    tx
      .update(ayuntamientos)
      .set({ marca: { ...MUNICIPIOS.motul.marca } })
      .where(eq(ayuntamientos.id, motul)),
  );

/**
 * La fila del escudo, que T4 puso como `<details name>` abierto: su cuerpo
 * —el escudo actual y las dos acciones— es visible sin tocar nada.
 */
const filaDelEscudo = (page: Page) =>
  page.locator("details").filter({
    has: page.getByRole("heading", { name: "Escudo del ayuntamiento" }),
  });

const casilla = (page: Page) =>
  filaDelEscudo(page).getByRole("checkbox", { name: /Confirmo quitar/ });

const botonDeQuitar = (page: Page) =>
  filaDelEscudo(page).getByRole("button", { name: "Quitar escudo" });

const abrirMarca = async (page: Page) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/marca"));
};

/** La sesion se abre con script; lo que se prueba despues corre sin el. */
const contextoSinJavaScript = async (browser: Browser) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  return browser.newContext({ javaScriptEnabled: false, storageState: estado });
};

test.beforeEach(liberarVentanaDeRitmo);

test.beforeEach(restaurarMarca);

test("muestra el escudo actual y ofrece quitarlo sin abrir nada", async ({
  page,
}) => {
  await abrirMarca(page);

  await expect(filaDelEscudo(page)).toContainText(
    "Con escudo: la banda del municipio lo muestra junto al nombre.",
  );
  await expect(filaDelEscudo(page)).toContainText("Escudo actual");
  // Dos: la miniatura del resumen y el escudo actual del cuerpo.
  await expect(filaDelEscudo(page).locator("img")).toHaveCount(2);
  await expect(filaDelEscudo(page).locator("img").first()).toHaveAttribute(
    "src",
    ESCUDO_SEMBRADO,
  );
  await expect(botonDeQuitar(page)).toBeVisible();
  await expect(casilla(page)).not.toBeChecked();
});

test("sin la casilla el servidor no quita el escudo", async ({ page }) => {
  await abrirMarca(page);

  // Un POST a mano no trae la casilla: el `required` es del navegador y el
  // servidor lo vuelve a exigir. Se quita el atributo para hablarle a la
  // accion, que es lo que haria un formulario armado a mano.
  await casilla(page).evaluate((nodo) => nodo.removeAttribute("required"));
  await botonDeQuitar(page).click();

  await expect(page).toHaveURL(/error=quitar-sin-confirmar/);
  await expect(page.locator("main").getByRole("alert")).toHaveText(
    "Para quitar el escudo, marque la casilla de confirmación.",
  );
  expect((await marcaDeMotul()).escudo).toBe(ESCUDO_SEMBRADO);
});

test("con la casilla el escudo se va y la fila dice «Sin escudo»", async ({
  page,
}) => {
  await abrirMarca(page);

  await casilla(page).check();
  await botonDeQuitar(page).click();

  await expect(page).toHaveURL(/ok=escudo-quitado/);
  await expect(page.locator("main").getByRole("status")).toHaveText(
    "Se quitó el escudo.",
  );
  await expect(filaDelEscudo(page)).toContainText(
    "Sin escudo: la banda del municipio muestra solo el nombre.",
  );
  await expect(filaDelEscudo(page)).toContainText("Sin escudo");
  await expect(filaDelEscudo(page).locator("img")).toHaveCount(0);
  await expect(botonDeQuitar(page)).toHaveCount(0);
  expect((await marcaDeMotul()).escudo).toBeUndefined();

  // La banda del municipio se queda solo con el nombre: es el estado sin
  // escudo del layout, no una imagen rota.
  await expect(
    page
      .getByRole("link", { name: `${MUNICIPIOS.motul.nombre}, inicio` })
      .first()
      .locator("img"),
  ).toHaveCount(0);
});

test("sin JavaScript, quitar el escudo exige la casilla y funciona igual", async ({
  browser,
}) => {
  const contexto = await contextoSinJavaScript(browser);

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/marca"));

    await casilla(page).check();
    await botonDeQuitar(page).click();

    // El POST nativo vuelve pintado por el `redirect` de la accion, con el
    // aviso como codigo traducido por la pantalla (S4).
    await expect(page).toHaveURL(/ok=escudo-quitado/);
    await expect(
      page.getByText("Se quitó el escudo.", { exact: true }),
    ).toBeVisible();
    expect((await marcaDeMotul()).escudo).toBeUndefined();
  } finally {
    await contexto.close();
  }
});
