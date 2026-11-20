import { randomBytes } from "node:crypto";
import { type Browser, expect, type Page, test } from "@playwright/test";
import postgres, { type TransactionSql } from "postgres";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { filaAusente, type IdRow } from "./escenarioSql";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S7, S8 y S9 de `intervenciones-ux`, contra la aplicacion construida y
 * Postgres real:
 *
 * - S7: el mínimo de la descripción se explica en español antes de escribir y
 *   el rechazo sale en español, nunca el mensaje del navegador.
 * - S8: un alta rechazada vuelve con lo capturado y la URL lleva solo el
 *   token del borrador.
 * - S9: sin lugar no se ofrece «Sin calle» y los obligatorios se marcan.
 *
 * El escenario es propio y no el de `calles.fixture` porque la raíz es
 * `comisaria` -`calles.spec.ts` ya ocupa la única cabecera de Motul- y solo
 * hace falta un lugar donde registrar.
 */
type Escenario = {
  lugar: { id: string; nombre: string };
  marca: string;
};

const abrirConexion = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");

  return postgres(url, { max: 1 });
};

const sembrar = async (): Promise<Escenario> => {
  const marca = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const nombre = `Alta de intervencion ${marca}`;
  const app = abrirConexion();

  try {
    return await app.begin(async (tx: TransactionSql) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      const [lugar = { id: filaAusente("lugar") }] = await tx<IdRow[]>`
        INSERT INTO lugares (ayuntamiento_id, tipo, nombre)
        VALUES (${MUNICIPIOS.motul.id}, 'comisaria', ${nombre})
        RETURNING id
      `;

      return { lugar: { id: lugar.id, nombre }, marca };
    });
  } finally {
    await app.end();
  }
};

let escenario: Escenario;

test.beforeAll(async () => {
  escenario = await sembrar();
});

test.beforeEach(liberarVentanaDeRitmo);

const OBLIGATORIOS = "Todos los campos son obligatorios, salvo la calle.";
const AYUDA_DE_DESCRIPCION =
  "Escriba al menos 10 caracteres: qué se hizo, no quién lo pidió.";
const DESCRIPCION_CORTA = "La descripción debe tener al menos 10 caracteres.";
/** Cinco caracteres: por debajo del mínimo, que es lo que prueba el rechazo. */
const CAPTURA_CORTA = "Bache";

const abrirAlta = async (page: Page) => {
  await page.goto(urlDe("motul", "/intervenciones/alta"));
  await expect(
    page.getByRole("heading", { name: "Registrar intervención" }),
  ).toBeVisible();
};

const contextoSinJavaScript = async (browser: Browser) => {
  const conSesion = await browser.newContext();
  await accederAMotul(await conSesion.newPage());
  const estado = await conSesion.storageState();
  await conSesion.close();

  return browser.newContext({
    javaScriptEnabled: false,
    storageState: estado,
  });
};

const capturarAltaCorta = async (page: Page, descripcion: string) => {
  await page.getByLabel("Tipo de obra").selectOption("BACHE");
  await page
    .getByLabel("Lugar", { exact: true })
    .selectOption(escenario.lugar.id);
  await page.getByLabel("Fecha de ocurrencia").fill("2026-11-20");
  await page.getByLabel("Descripción", { exact: true }).fill(descripcion);
  await page.getByRole("button", { name: "Registrar intervención" }).click();
};

const esperarLoCapturado = async (page: Page, descripcion: string) => {
  await expect(page.getByLabel("Tipo de obra")).toHaveValue("BACHE");
  await expect(page.getByLabel("Lugar", { exact: true })).toHaveValue(
    escenario.lugar.id,
  );
  await expect(page.getByLabel("Fecha de ocurrencia")).toHaveValue(
    "2026-11-20",
  );
  await expect(page.getByLabel("Descripción", { exact: true })).toHaveValue(
    descripcion,
  );
};

test("sin lugar elegido no hay «Sin calle» y los obligatorios se dicen", async ({
  page,
}) => {
  await accederAMotul(page);
  await abrirAlta(page);

  await expect(page.getByText(OBLIGATORIOS)).toBeVisible();
  await expect(page.getByText(AYUDA_DE_DESCRIPCION)).toBeVisible();

  const calle = page.getByLabel("Calle (opcional)");
  await expect(
    calle.getByRole("option", { name: "Elija primero el lugar" }),
  ).toHaveCount(1);
  await expect(calle.getByRole("option", { name: "Sin calle" })).toHaveCount(0);

  await page
    .getByLabel("Lugar", { exact: true })
    .selectOption(escenario.lugar.id);

  await expect(calle.getByRole("option", { name: "Sin calle" })).toHaveCount(1);
});

test("sin JavaScript, una descripción corta se rechaza en español y vuelve con lo capturado", async ({
  browser,
}) => {
  const contexto = await contextoSinJavaScript(browser);
  const page = await contexto.newPage();

  try {
    await abrirAlta(page);
    await capturarAltaCorta(page, CAPTURA_CORTA);

    // El mensaje es el del servidor: el navegador no lo dio por corto.
    await expect(page.getByText(DESCRIPCION_CORTA)).toBeVisible();
    await expect(page.getByText(/Please lengthen/)).toHaveCount(0);
    await esperarLoCapturado(page, CAPTURA_CORTA);

    // La URL lleva solo el token: la descripción no llega a los logs.
    expect(page.url()).toMatch(/[?&]borrador=[0-9a-f-]{36}/);
    expect(page.url()).not.toContain(CAPTURA_CORTA);
  } finally {
    await contexto.close();
  }
});

test("recargar el alta rechazada la vuelve a llenar desde la cookie", async ({
  page,
}) => {
  await accederAMotul(page);
  await abrirAlta(page);
  await capturarAltaCorta(page, CAPTURA_CORTA);
  await expect(page.getByText(DESCRIPCION_CORTA)).toBeVisible();

  // Recargar es una carga completa: lo que rellena es la cookie, no el DOM.
  await page.reload();
  await esperarLoCapturado(page, CAPTURA_CORTA);
});
