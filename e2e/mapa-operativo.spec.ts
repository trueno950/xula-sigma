import { expect, type Page, test } from "@playwright/test";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { CLAVE, CORREO, urlDe } from "./municipios";

let escenario: Scenario;

// Con `comisaria`: `calles.spec.ts` ya ocupa la unica cabecera de Motul.
test.beforeAll(async () => {
  await liberarVentanaDeRitmo();
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
});

const marcadorDeReporte = () =>
  new RegExp(`Reporte ciudadano: ${escenario.folio}`);

// Reintenta porque `pnpm start` suma el limitador en memoria de Better Auth,
// que ninguna base vacia: los specs anteriores de la corrida ya accedieron
// con este mismo correo. Mismo motivo y mismo bucle que `bajaDeLugar.spec.ts`.
async function acceder(page: Page, municipio: "motul" | "ticul") {
  for (let intento = 0; intento < 5; intento++) {
    await page.goto(urlDe(municipio, "/acceso"));
    await page.getByLabel("Correo").fill(CORREO);
    await page.getByLabel("Contrasenia").fill(CLAVE);
    await page.getByRole("button", { name: "Entrar" }).click();

    try {
      await page.waitForURL(urlDe(municipio), { timeout: 5_000 });
      await page.goto(urlDe(municipio, "/padron"));
      return;
    } catch {
      await page.waitForTimeout(5_000);
    }
  }

  throw new Error("No se pudo acceder: la ventana de ritmo no se libero.");
}

async function verificarEventosSinSesion(page: Page): Promise<void> {
  const respuesta = await page
    .context()
    .request.get(urlDe("motul", "/eventos"));
  expect(respuesta.status()).toBe(401);
}

async function verificarEventos(page: Page): Promise<void> {
  const resultado = await page.evaluate(async () => {
    const abortador = new AbortController();
    const respuesta = await fetch("/eventos", { signal: abortador.signal });
    const lector = respuesta.body?.getReader();
    const primeraLectura = await lector?.read();
    abortador.abort();
    return {
      estado: respuesta.status,
      tipo: respuesta.headers.get("content-type"),
      primerMarco: new TextDecoder().decode(primeraLectura?.value),
    };
  });

  expect(resultado.estado).toBe(200);
  expect(resultado.tipo).toContain("text/event-stream");
  expect(resultado.primerMarco).toContain("event: resync");
}

async function abrirMapaDeMotul(page: Page): Promise<void> {
  await verificarEventosSinSesion(page);
  await acceder(page, "motul");
  await verificarEventos(page);
  await page.getByRole("link", { name: "Mapa operativo" }).click();
  await expect(
    page.getByRole("heading", { name: "Mapa operativo", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Actualización en vivo")).toBeVisible();
}

async function interrumpirCanalEnMapa(page: Page): Promise<void> {
  await page.route("**/eventos", (route) => route.abort());
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Mapa operativo", exact: true }),
  ).toBeVisible();
}

async function verificarMapaDesconectado(page: Page): Promise<void> {
  await expect(
    page.getByRole("link", { name: marcadorDeReporte() }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Cobertura faltante" }),
  ).toBeVisible();
  await expect(page.getByText("Actualización desconectada")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Actualizar ahora" }),
  ).toBeVisible();
}

async function verificarHistorial(page: Page): Promise<void> {
  await page
    .getByRole("link", { name: "Ver historial de calle" })
    .and(
      page.locator(`[href$="/calles/${escenario.reporteCalleId}/historial"]`),
    )
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Historial de calle", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Reporte", { exact: true })).toBeVisible();
  await expect(page.getByText("Intervención", { exact: true })).toBeVisible();
  // La intervencion se sembro con fecha 2026-01-15: el dia civil, sin hora.
  await expect(page.getByText("15 ene 2026", { exact: true })).toBeVisible();
}

async function verificarAislamientoDeTicul(page: Page): Promise<void> {
  await acceder(page, "ticul");
  await page.goto(urlDe("ticul", "/mapa-operativo"));
  await expect(
    page.getByRole("link", { name: marcadorDeReporte() }),
  ).toHaveCount(0);
  const respuesta = await page.goto(
    urlDe("ticul", `/calles/${escenario.reporteCalleId}/historial`),
  );
  expect(respuesta?.status()).toBe(404);
  await expect(
    page.getByText("No encontramos eso. Puede que ya no exista."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Historial de calle" }),
  ).toHaveCount(0);
}

test("mapa operativo muestra snapshot, desconexión e historial sin filtrar otro municipio", async ({
  page,
}) => {
  await abrirMapaDeMotul(page);
  await interrumpirCanalEnMapa(page);
  await verificarMapaDesconectado(page);
  await verificarHistorial(page);
  await verificarAislamientoDeTicul(page);
});
