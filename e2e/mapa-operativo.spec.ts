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

const resumenDelMapa = (page: Page) =>
  page.getByRole("region", { name: "Resumen del mapa" });

/**
 * Entra al municipio y deja la sesion puesta.
 *
 * Motul va por `accederAMotul`, que rota la IP TEST-NET de cada acceso y
 * limpia el contador de intentos: el limitador en memoria de Better Auth
 * comparte bucket entre los specs de la corrida, y un bucle de reintentos aca
 * gastaba el tiempo del test sin arreglar la causa. Ticul entra por su propio
 * origen -la cookie es por subdominio- y es el unico acceso de la corrida que
 * no cubre ese helper.
 */
async function acceder(page: Page, municipio: "motul" | "ticul") {
  if (municipio === "motul") {
    await accederAMotul(page);
    await page.goto(urlDe("motul", "/padron"));
    return;
  }

  await page.goto(urlDe(municipio, "/acceso"));
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contraseña").fill(CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(urlDe(municipio), { timeout: 15_000 });
  await page.goto(urlDe(municipio, "/padron"));
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

const mapa = (page: Page) =>
  page.getByRole("region", {
    name: /Mapa con los marcadores del municipio/,
  });

async function interrumpirCanalEnMapa(page: Page): Promise<void> {
  await page.route("**/eventos", (route) => route.abort());
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Mapa operativo", exact: true }),
  ).toBeVisible();
}

/**
 * S1 y S4: el estado en vivo deja de ser una tarjeta y la lista de lo que no
 * se puede dibujar vive en su pestana, asi que lo que se mira es la fila del
 * resumen y el enlace del panel.
 */
async function verificarMapaDesconectado(page: Page): Promise<void> {
  await expect(
    page.getByRole("link", { name: marcadorDeReporte() }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Sin ubicar/ })).toBeVisible();
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
  const respuesta = await page.goto(
    urlDe("motul", "/calles/no-es-un-uuid/historial"),
  );
  expect(respuesta?.status()).toBe(404);
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

const pliegueDeFiltros = (page: Page) =>
  page.locator("details", {
    has: page.locator("summary", { hasText: "Filtros" }),
  });
const pliegueDeLeyenda = (page: Page) =>
  page.getByRole("region", { name: "Leyenda del mapa" }).locator("details");

/**
 * S2: en el telefono -y sin JavaScript en cualquier ancho- los filtros
 * arrancan plegados. El estado se lee de `details.open`: el contenido de un
 * `details` cerrado conserva su caja, asi que `isVisible()` no alcanza para
 * saber si la barra esta a la vista.
 */
const abrirFiltrosSiHaceFalta = async (page: Page) => {
  const pliegue = pliegueDeFiltros(page);
  const abierto = await pliegue.evaluate(
    (nodo) => (nodo as HTMLDetailsElement).open,
  );
  if (!abierto) await pliegue.locator("summary").click();
};

const elegirTerritorio = async (page: Page, lugarId: string) => {
  await abrirFiltrosSiHaceFalta(page);
  const selector = page.getByRole("combobox", { name: "Territorio" });
  await selector.selectOption(lugarId);
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
  await expect(resumenDelMapa(page)).toContainText("3 hechos");
  await expect(resumenDelMapa(page)).toContainText("1 calle en el mapa");
  await expect(
    page.getByRole("link", { name: marcadorDeReporte() }),
  ).toBeVisible();

  const region = mapa(page);
  await expect(region).toHaveAttribute("data-limites");
  const limites = await limitesDelMapa(region);
  // La unica calle ubicada del escenario, con su margen.
  expect(limites.sur).toBeCloseTo(21.283 - 0.005, 5);
  expect(limites.oeste).toBeCloseTo(-89.667 - 0.005, 5);
  expect(limites.norte).toBeCloseTo(21.283 + 0.005, 5);
  expect(limites.este).toBeCloseTo(-89.667 + 0.005, 5);

  // La vista entra ya en el minimo y el control de alejar nace deshabilitado.
  const zoomMinimo = Number(await region.getAttribute("data-min-zoom"));
  expect(zoomMinimo).toBeGreaterThanOrEqual(10);
  expect(await zoomDelMapa(region)).toBe(zoomMinimo);

  // Leaflet deshabilita alejar cuando el zoom ya es el minimo, y el clic
  // forzado no lo mueve: no hay forma de alejarse hasta las comisarias
  // vecinas, que es lo que el pedido original pedia.
  const alejar = region.getByRole("button", { name: "Zoom out" });
  await expect(alejar).toBeDisabled();
  for (let clic = 0; clic < 3; clic++) {
    await alejar.click({ force: true });
  }

  expect(await zoomDelMapa(region)).toBe(zoomMinimo);
  await expect(alejar).toBeDisabled();
});

test("mapa operativo avisa cuando el territorio no tiene calles ubicadas", async ({
  page,
}) => {
  await abrirMapaDeMotul(page);

  await elegirTerritorio(page, escenario.vacioId);

  await expect(page.getByText(/Sin resultados para/)).toBeVisible();
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
    await expect(page.getByText(/Sin resultados para/)).toBeVisible();

    await elegirTerritorio(page, escenario.origenId);
    await expect(
      page.getByRole("link", { name: marcadorDeReporte() }),
    ).toBeVisible();
  } finally {
    await contexto.close();
  }
});

/**
 * S4: la pestana elegida viaja en la URL, asi que sin JavaScript se alcanzan
 * las dos listas. La segunda mitad del test es la que importa: con el
 * navegador sin scripts, entrar a `?panel=sin-ubicar` muestra la lista de lo
 * que no se puede dibujar, y la de las calles sigue en el documento.
 */
test("sin JavaScript, la pestaña «Sin ubicar» se alcanza por la URL", async ({
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
    await page.getByRole("link", { name: /Sin ubicar/ }).click();
    await expect(page).toHaveURL(/panel=sin-ubicar/);

    await expect(page.getByText("No se pueden dibujar")).toBeVisible();
    await expect(
      page.getByRole("list", { name: /Calles sin ubicar en/ }).first(),
    ).toBeVisible();
    // La otra pestana sigue en el HTML: se alcanza sin JavaScript.
    await expect(page.locator('[data-panel="en-el-mapa"]')).toHaveCount(1);
  } finally {
    await contexto.close();
  }
});

/**
 * S5 y L3: el pin lleva el numero de orden de su fila, y elegir la fila marca
 * su marcador con `data-elegida` y abre su ventana. El numero se compara
 * leyendo los dos lados, no una copia de la configuracion.
 */
test("la fila y su marcador comparten numero y se eligen entre si", async ({
  page,
}) => {
  await abrirMapaDeMotul(page);
  await elegirTerritorio(page, escenario.origenId);

  const fila = page
    .locator("[data-calle]")
    .filter({ has: page.getByRole("link", { name: marcadorDeReporte() }) })
    .first();
  await expect(fila).toBeVisible();
  await expect(fila).toContainText("2 hechos en esta calle");
  const numeroDeLaFila = (
    await fila.locator("[data-numero-de-fila]").innerText()
  ).trim();

  const pin = mapa(page).locator(".leaflet-marker-icon").first();
  await expect(pin.locator("[data-orden]")).toHaveText(numeroDeLaFila);
  await expect(pin).not.toHaveAttribute("data-elegida", "1");

  // S4: el folio y la insignia de estado comparten linea; el folio largo del
  // escenario es justamente el caso que las separaba en dos renglones.
  const folio = fila.getByRole("link", { name: marcadorDeReporte() });
  const insignia = fila.getByText("Recibido", { exact: true });
  const [cajaDelFolio, cajaDeLaInsignia] = await Promise.all([
    folio.boundingBox(),
    insignia.boundingBox(),
  ]);
  if (!cajaDelFolio || !cajaDeLaInsignia)
    throw new Error("La fila no dibujó el folio y su insignia.");
  const centroDelFolio = cajaDelFolio.y + cajaDelFolio.height / 2;
  const centroDeLaInsignia = cajaDeLaInsignia.y + cajaDeLaInsignia.height / 2;
  expect(Math.abs(centroDelFolio - centroDeLaInsignia)).toBeLessThan(8);

  await fila.getByRole("button").click();

  await expect(pin).toHaveAttribute("data-elegida", "1");
  await expect(fila).toHaveAttribute("data-elegida", "1");
  await expect(page.locator(".leaflet-popup-content")).toContainText(
    "2 hechos en esta calle",
  );

  // Elegir el marcador devuelve la marca a la fila.
  await pin.click();
  await expect(fila).toHaveAttribute("data-elegida", "1");
});

test("mapa operativo publica la leyenda dentro del mapa, con sus conteos", async ({
  page,
}) => {
  await abrirMapaDeMotul(page);
  await elegirTerritorio(page, escenario.origenId);

  // El reporte y la intervencion del escenario comparten calle: un pin, dos
  // hechos adentro, y la fila lo dice.
  await expect(mapa(page).locator("[data-orden]")).toHaveCount(1);
  await expect(page.getByText("2 hechos en esta calle").first()).toBeVisible();

  const leyenda = page.getByRole("region", { name: "Leyenda del mapa" });
  const porTipo = leyenda.getByRole("list", { name: "Conteo por tipo" });
  const porEstado = leyenda.getByRole("list", { name: "Conteo por estado" });

  await expect(leyenda).toBeVisible();
  await expect(porTipo).toContainText(/Bache\s*1/);
  await expect(porTipo).toContainText(/Obra\s*1/);
  await expect(porTipo).toContainText(/Mantenimiento\s*1/);
  await expect(porTipo).not.toContainText("(reporte)");
  await expect(porEstado).toContainText(/Recibido\s*1/);
  await expect(porEstado).toContainText(/Planificada\s*2/);
  // El total de la cabecera plegable es el de hechos, no el de pines.
  await expect(leyenda.locator("summary")).toContainText("3 hechos");

  // La leyenda flota sobre los tiles. Medido en Chromium: con la capa sin
  // `z-index` los panes de Leaflet (400) la tapan, y `elementFromPoint` igual
  // la encuentra —la pintura compuesta y el hit-test no coinciden—, asi que lo
  // que se afirma es el apilado que el navegador usa para pintar.
  await leyenda.scrollIntoViewIfNeeded();
  const apilado = await leyenda.evaluate((nodo) => {
    const zDe = (elemento: Element) =>
      Number(getComputedStyle(elemento).zIndex) || 0;
    const panes = [...document.querySelectorAll(".leaflet-pane")];
    return {
      leyenda: zDe(nodo),
      panes: Math.max(0, ...panes.map(zDe)),
    };
  });
  expect(apilado.leyenda).toBeGreaterThan(apilado.panes);

  // Y esta anclada abajo a la izquierda dentro del mapa, como en el tablero.
  const figura = page.getByRole("figure", { name: "Mapa de hechos por calle" });
  const [cajaDeLaFigura, cajaDeLaLeyenda] = await Promise.all([
    figura.boundingBox(),
    leyenda.boundingBox(),
  ]);
  if (!cajaDeLaFigura || !cajaDeLaLeyenda)
    throw new Error("El mapa o su leyenda no se dibujaron.");
  expect(cajaDeLaLeyenda.x - cajaDeLaFigura.x).toBeLessThan(40);
  expect(
    cajaDeLaFigura.y +
      cajaDeLaFigura.height -
      (cajaDeLaLeyenda.y + cajaDeLaLeyenda.height),
  ).toBeLessThan(40);
});

/**
 * S3 y S4 de `gestion-municipal`: cada territorio dice cuantas de sus calles
 * no tienen punto, con el enlace para ubicarlas, y la ventana de cada
 * marcador muestra la fecha civil del hecho -el registro del reporte y la
 * ocurrencia de la obra-.
 *
 * S6: las calles sin punto y los hechos sin punto comparten la pestana «Sin
 * ubicar»; la lista respeta el `?lugar=`, y en un territorio sin pendientes
 * no hay nada que mostrar.
 */
test("mapa operativo: «Sin ubicar» por territorio y fecha civil en la ventana", async ({
  page,
}) => {
  await abrirMapaDeMotul(page);
  await elegirTerritorio(page, escenario.origenId);

  // La ventana del pin: el folio del reporte con su fecha civil y la
  // ocurrencia de la obra, que el escenario siembra el 2026-01-15.
  const pin = mapa(page).locator(".leaflet-marker-icon").first();
  await pin.click();
  const ventana = page.locator(".leaflet-popup-content");
  await expect(ventana).toContainText(escenario.folio);
  await expect(ventana).toContainText("15 ene 2026");

  await page.getByRole("link", { name: /Sin ubicar/ }).click();
  await expect(page).toHaveURL(/panel=sin-ubicar/);

  const pendientes = page.getByRole("list", {
    name: /Calles sin ubicar en/,
  });
  await expect(pendientes).toContainText(escenario.movible);
  const enlace = pendientes.getByRole("link", { name: escenario.movible });
  await expect(enlace).toHaveAttribute(
    "href",
    new RegExp(`accion=ubicarCalle&calle=${escenario.movibleId}`),
  );

  // Los hechos que no se pueden dibujar estan en la misma pestana.
  await expect(
    page.getByRole("list", { name: "Hechos sin ubicar" }),
  ).toBeVisible();

  // Las dos pestanas se turnan el contenido: la de las calles dibujadas sigue
  // en el documento, pero no se ve.
  await page.getByRole("link", { name: /En el mapa/ }).click();
  await expect(pendientes).not.toBeVisible();
  await expect(
    page.getByRole("list", { name: "Calles con hechos" }),
  ).toBeVisible();

  // Y el enlace lleva al registro territorial con la calle ya abierta.
  await page.getByRole("link", { name: /Sin ubicar/ }).click();
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

/**
 * S1 y S2: en un telefono los filtros se pliegan detras de «Filtros (N)» -que
 * cuenta los puestos- y el mapa va primero. Las dos capturas quedan como
 * adjuntos de la corrida para comparar con el tablero.
 */
test("a 390px los filtros se pliegan detras de «Filtros (N)»", async ({
  page,
}, info) => {
  // El acceso gasta la ventana de ritmo compartida de la corrida y reintenta;
  // con el mapa todavia por delante, 30 s no alcanzan.
  test.setTimeout(120_000);
  // A 390px la navegacion del panel no ofrece el enlace del mapa, asi que se
  // entra por URL: lo que se prueba aca es la pantalla, no el menu. El acceso
  // va al ancho de escritorio para no depender del formulario movil.
  await acceder(page, "motul");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(urlDe("motul", "/mapa-operativo"));
  await expect(
    page.getByRole("heading", { name: "Mapa operativo", exact: true }),
  ).toBeVisible();

  const plegable = page.locator("summary", { hasText: "Filtros" });
  await expect(plegable).toContainText("Filtros");
  await expect(plegable).toContainText("(0)");

  // El mapa ocupa el alto del telefono de verdad: con la cadena de flex
  // resuelta a cero la region existia y no medía nada.
  const cajaDelMapa = await mapa(page).boundingBox();
  expect(cajaDelMapa?.height ?? 0).toBeGreaterThan(200);

  // Arrancan plegados: el mapa queda debajo del resumen, no de 450px de
  // formulario. Se abren con un toque.
  const pliegue = pliegueDeFiltros(page);
  await expect(pliegue).toHaveJSProperty("open", false);
  const cajaDelResumen = await resumenDelMapa(page).boundingBox();
  const cajaDeLaFigura = await page
    .getByRole("figure", { name: "Mapa de hechos por calle" })
    .boundingBox();
  if (!cajaDelResumen || !cajaDeLaFigura)
    throw new Error("El resumen o el mapa no se dibujaron.");
  expect(
    cajaDeLaFigura.y - (cajaDelResumen.y + cajaDelResumen.height),
  ).toBeLessThan(80);
  // La leyenda tambien arranca plegada: abierta tapa casi todo el mapa.
  await expect(pliegueDeLeyenda(page)).toHaveJSProperty("open", false);

  await plegable.click();
  await expect(pliegue).toHaveJSProperty("open", true);
  await expect(
    page.getByRole("figure", { name: "Mapa de hechos por calle" }),
  ).toBeVisible();

  await info.attach("mapa-operativo-390.png", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.getByRole("combobox", { name: "Estado" }).selectOption("RECIBIDO");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await page.waitForURL(/estado=RECIBIDO/);

  // Con un filtro puesto el pliegue lo cuenta, y el chip permite quitarlo.
  await expect(plegable).toContainText("(1)");
  await expect(page.getByText("Estado: Recibido")).toBeVisible();
});

test("a 1440px el mapa y su panel van lado a lado", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await abrirMapaDeMotul(page);
  await elegirTerritorio(page, escenario.origenId);

  // Desde 1024px la barra esta abierta de entrada: la abre el cliente al
  // montar, no el HTML del servidor.
  await expect(pliegueDeFiltros(page)).toHaveJSProperty("open", true);
  await expect(pliegueDeLeyenda(page)).toHaveJSProperty("open", true);

  const figura = page.getByRole("figure", { name: "Mapa de hechos por calle" });
  const panel = page.getByRole("region", { name: "Calles del mapa" });
  const cajaDeLaFigura = await figura.boundingBox();
  const cajaDelPanel = await panel.boundingBox();
  if (!cajaDeLaFigura || !cajaDelPanel)
    throw new Error("El mapa y su panel no se dibujaron.");

  // Lado a lado: el panel empieza a la derecha del mapa y los dos arrancan a
  // la misma altura.
  expect(cajaDelPanel.x).toBeGreaterThan(cajaDeLaFigura.x);
  expect(Math.abs(cajaDelPanel.y - cajaDeLaFigura.y)).toBeLessThan(4);
  expect(cajaDeLaFigura.height).toBeGreaterThanOrEqual(560);

  await info.attach("mapa-operativo-1440.png", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
