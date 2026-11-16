import { expect, type Locator, type Page, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
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
    await page.getByLabel("Contraseña").fill(CLAVE);
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
    page.getByRole("heading", { name: escenario.reporte, exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Ruta" })
      .getByText(escenario.reporte, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Reporte", { exact: true })).toBeVisible();
  await expect(page.getByText("Intervención", { exact: true })).toBeVisible();
  // La intervencion se sembro con fecha 2026-01-15: el dia civil, sin hora.
  await expect(page.getByText("15 ene 2026", { exact: true })).toBeVisible();
}

async function verificarIdMalFormado(page: Page): Promise<void> {
  const respuesta = await page.goto(
    urlDe("motul", "/calles/no-es-un-uuid/historial"),
  );
  expect(respuesta?.status()).toBe(404);
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
    page.getByRole("heading", { name: escenario.reporte }),
  ).toHaveCount(0);
}

test("mapa operativo muestra snapshot, desconexión e historial sin filtrar otro municipio", async ({
  page,
}) => {
  await abrirMapaDeMotul(page);
  await interrumpirCanalEnMapa(page);
  await verificarMapaDesconectado(page);
  await verificarHistorial(page);
  await verificarIdMalFormado(page);
  await verificarAislamientoDeTicul(page);
});

/**
 * S2 de `mapa-territorial`: la vista se queda en el territorio elegido. Lo
 * que se lee es lo que el mapa dejo anotado en su propio contenedor
 * (`data-min-zoom`, `data-zoom`, `data-limites`), no una copia de la
 * configuracion: por eso tambien se hace clic en el zoom-out real y se
 * comprueba que no baja del minimo.
 */
const limitesDelMapa = async (region: Locator) => {
  const texto = await region.getAttribute("data-limites");
  if (!texto) throw new Error("El mapa no declaró sus límites.");
  const [sur, oeste, norte, este] = texto.split(",").map(Number);
  return { sur, oeste, norte, este };
};

const zoomDelMapa = async (region: Locator) =>
  Number(await region.getAttribute("data-zoom"));

const elegirTerritorio = async (page: Page, lugarId: string) => {
  await page
    .getByRole("combobox", { name: "Territorio" })
    .selectOption(lugarId);
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(new RegExp(`lugar=${lugarId}`));
};

test("mapa operativo acota hechos y vista al territorio elegido", async ({
  page,
}) => {
  await abrirMapaDeMotul(page);

  const selector = page.getByRole("combobox", { name: "Territorio" });
  await expect(selector).toBeVisible();
  await expect(selector.locator('option[value=""]')).toHaveText(
    "Todo el municipio",
  );
  await expect(
    selector.locator(`option[value="${escenario.origenId}"]`),
  ).toHaveCount(1);
  await expect(
    selector.locator(`option[value="${escenario.vacioId}"]`),
  ).toHaveCount(1);

  await elegirTerritorio(page, escenario.origenId);

  // Solo los hechos del subarbol: el reporte y las dos intervenciones del
  // escenario. Cualquier hecho de otra localidad romperia el conteo.
  await expect(page.getByText("1 reporte · 2 intervenciones")).toBeVisible();
  await expect(
    page.getByRole("link", { name: marcadorDeReporte() }),
  ).toBeVisible();

  const mapa = page.getByRole("region", {
    name: /Mapa con los marcadores del municipio/,
  });
  await expect(mapa).toHaveAttribute("data-limites");
  const limites = await limitesDelMapa(mapa);
  // La unica calle ubicada del escenario, con su margen.
  expect(limites.sur).toBeCloseTo(21.283 - 0.005, 5);
  expect(limites.oeste).toBeCloseTo(-89.667 - 0.005, 5);
  expect(limites.norte).toBeCloseTo(21.283 + 0.005, 5);
  expect(limites.este).toBeCloseTo(-89.667 + 0.005, 5);

  // La vista entra ya en el minimo y el control de alejar nace deshabilitado.
  const zoomMinimo = Number(await mapa.getAttribute("data-min-zoom"));
  expect(zoomMinimo).toBeGreaterThanOrEqual(10);
  expect(await zoomDelMapa(mapa)).toBe(zoomMinimo);

  // Leaflet deshabilita alejar cuando el zoom ya es el minimo, y el clic
  // forzado no lo mueve: no hay forma de alejarse hasta las comisarias
  // vecinas, que es lo que el pedido original pedia.
  const alejar = mapa.getByRole("button", { name: "Zoom out" });
  await expect(alejar).toBeDisabled();
  for (let clic = 0; clic < 3; clic++) {
    await alejar.click({ force: true });
  }

  expect(await zoomDelMapa(mapa)).toBe(zoomMinimo);
  await expect(alejar).toBeDisabled();
});

test("mapa operativo avisa cuando el territorio no tiene calles ubicadas", async ({
  page,
}) => {
  await abrirMapaDeMotul(page);

  await elegirTerritorio(page, escenario.vacioId);

  await expect(
    page.getByText("No hay hechos para los filtros seleccionados."),
  ).toBeVisible();
  await expect(page.getByText(/El mapa muestra todo Yucatán\./)).toBeVisible();
  await expect(
    page.getByRole("region", { name: /Mapa con los marcadores del municipio/ }),
  ).toHaveCount(0);
});

test("sin JavaScript, el territorio elegido filtra la lista del mapa", async ({
  browser,
}) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  const contexto = await browser.newContext({
    javaScriptEnabled: false,
    storageState: estado,
  });

  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/mapa-operativo"));
    await expect(
      page.getByRole("link", { name: marcadorDeReporte() }),
    ).toBeVisible();

    await elegirTerritorio(page, escenario.vacioId);
    await expect(
      page.getByRole("link", { name: marcadorDeReporte() }),
    ).toHaveCount(0);
    await expect(
      page.getByText("No hay hechos para los filtros seleccionados."),
    ).toBeVisible();

    await elegirTerritorio(page, escenario.origenId);
    await expect(
      page.getByRole("link", { name: marcadorDeReporte() }),
    ).toBeVisible();
  } finally {
    await contexto.close();
  }
});

test("mapa operativo agrupa por calle y publica la leyenda con conteos", async ({
  page,
}) => {
  await abrirMapaDeMotul(page);
  await elegirTerritorio(page, escenario.origenId);

  const mapa = page.getByRole("region", {
    name: /Mapa con los marcadores del municipio/,
  });
  // El reporte y la intervencion del escenario comparten calle: un pin, dos
  // hechos adentro.
  await expect(mapa.locator('[data-hechos="2"]')).toHaveCount(1);
  await expect(page.getByText("2 hechos en esta calle")).toBeVisible();

  const leyenda = page.getByRole("region", { name: "Leyenda del mapa" });
  const porTipo = leyenda.getByRole("list", { name: "Conteo por tipo" });
  const porEstado = leyenda.getByRole("list", { name: "Conteo por estado" });

  await expect(porTipo).toBeVisible();
  await expect(porTipo).toContainText("Bache (reporte) 1");
  await expect(porTipo).toContainText("Obra (intervención) 1");
  await expect(porTipo).toContainText("Mantenimiento (intervención) 1");
  await expect(porEstado).toContainText("Recibido 1");
  await expect(porEstado).toContainText("Planificada 2");
});

/**
 * S3 y S4 de `gestion-municipal`: cada territorio dice cuantas de sus calles
 * no tienen punto, con el enlace para ubicarlas, y la ventana de cada
 * marcador muestra la fecha civil del hecho -el registro del reporte y la
 * ocurrencia de la obra-.
 *
 * La seccion respeta el `?lugar=`: en un territorio sin calles sin punto no
 * aparece, que es lo mismo que decir que no esta contando todo el municipio
 * cuando la vista esta acotada.
 */
test("mapa operativo: calles sin ubicar por territorio y fecha civil en la ventana", async ({
  page,
}) => {
  await abrirMapaDeMotul(page);
  await elegirTerritorio(page, escenario.origenId);

  const seccion = page.getByRole("region", { name: "Calles sin ubicar" });
  await expect(seccion).toBeVisible();

  const pendientes = page.getByRole("list", {
    name: /Calles sin ubicar en/,
  });
  await expect(pendientes).toContainText(escenario.movible);
  await expect(
    pendientes.getByRole("link", { name: escenario.movible }),
  ).toHaveAttribute(
    "href",
    new RegExp(`accion=ubicarCalle&calle=${escenario.movibleId}`),
  );

  // La ventana del pin: el folio del reporte con su fecha civil y la
  // ocurrencia de la obra, que el escenario siembra el 2026-01-15.
  const mapa = page.getByRole("region", {
    name: /Mapa con los marcadores del municipio/,
  });
  await mapa.locator(".leaflet-marker-icon").first().click();
  const ventana = page.locator(".leaflet-popup-content");
  await expect(ventana).toContainText(escenario.folio);
  await expect(ventana).toContainText("15 ene 2026");

  // Acotado a un territorio sin calles pendientes, la seccion no aparece.
  await elegirTerritorio(page, escenario.vacioId);
  await expect(seccion).toHaveCount(0);

  // Y el enlace lleva al registro territorial con la calle ya abierta.
  await elegirTerritorio(page, escenario.origenId);
  await pendientes.getByRole("link", { name: escenario.movible }).click();
  await expect(page).toHaveURL(
    new RegExp(
      `/territorio\\?raiz=.*accion=ubicarCalle&calle=${escenario.movibleId}`,
    ),
  );
  await expect(
    page.getByRole("heading", { name: escenario.movible }),
  ).toBeVisible();
});
