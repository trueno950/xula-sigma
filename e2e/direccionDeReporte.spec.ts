import { expect, type Page, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import {
  type EscenarioDeDireccionDeReporte,
  leerUbicacionDeReporte,
  prepararEscenarioDeDireccionDeReporte,
} from "./direccionDeReporte.fixture";
import { urlDe } from "./municipios";

let escenario: EscenarioDeDireccionDeReporte;

test.beforeAll(async () => {
  escenario = await prepararEscenarioDeDireccionDeReporte();
});

const camposDeUbicacion = (page: Page) =>
  page.locator("form").evaluate((form) => {
    const datos = new FormData(form as HTMLFormElement);
    return {
      domicilioId: datos.get("domicilioId"),
      lugarId: datos.get("lugarId"),
      calleId: datos.get("calleId"),
      consulta: datos.get("consulta"),
    };
  });

const idDelReporteEnLaRuta = (page: Page): string => {
  const segmentos = new URL(page.url()).pathname.split("/");
  const id = segmentos.at(-1);
  if (!id) throw new Error("La ruta del reporte no contiene su identificador.");
  return id;
};

const abrirAltaDeReporte = async (page: Page) => {
  await page.goto(urlDe("motul", "/reportes/alta"));
  await expect(
    page.getByRole("heading", { name: "Registrar reporte" }),
  ).toBeVisible();
};

test("seleccionar una dirección guarda su vínculo y la búsqueda nunca revive resultados obsoletos", async ({
  page,
}) => {
  await accederAMotul(page);
  await abrirAltaDeReporte(page);
  await expect(page.getByLabel("Lugar", { exact: true })).toBeVisible();
  await page.getByLabel("Domicilio registrado", { exact: true }).check();

  const consulta = page.getByLabel("Buscar una dirección registrada");
  const direcciones = page.getByLabel("Dirección para el reporte");
  let interceptadas = 0;
  let anunciarPrimera: () => void = () => {};
  let anunciarSegunda: () => void = () => {};
  let liberarSegunda: () => void = () => {};
  const primeraInterceptada = new Promise<void>((resolve) => {
    anunciarPrimera = resolve;
  });
  const segundaInterceptada = new Promise<void>((resolve) => {
    anunciarSegunda = resolve;
  });
  const segundaLiberada = new Promise<void>((resolve) => {
    liberarSegunda = resolve;
  });
  const primeraRespuesta = page.waitForResponse((respuesta) => {
    const solicitud = respuesta.request();
    return (
      solicitud.method() === "POST" &&
      Boolean(solicitud.headers()["next-action"])
    );
  });

  await page.route("**/*", async (ruta) => {
    const solicitud = ruta.request();
    if (solicitud.method() === "POST" && solicitud.headers()["next-action"]) {
      interceptadas += 1;
      if (interceptadas === 1) {
        anunciarPrimera();
        await new Promise<void>((resolve) => setTimeout(resolve, 600));
      }
      if (interceptadas === 2) {
        anunciarSegunda();
        await segundaLiberada;
      }
    }
    await ruta.continue();
  });

  try {
    await consulta.fill(escenario.consulta);
    await primeraInterceptada;
    await consulta.fill(`sin resultados ${escenario.consulta}`);
    await segundaInterceptada;
    await primeraRespuesta;

    await expect(
      page.getByText("Buscando direcciones registradas...", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(escenario.etiqueta, { exact: true }),
    ).toHaveCount(0);

    liberarSegunda();
    await expect(
      page.getByText(
        "No se encontraron direcciones. Puede indicar lugar y calle.",
        {
          exact: true,
        },
      ),
    ).toBeVisible();
  } finally {
    liberarSegunda();
    await page.unroute("**/*");
  }

  await consulta.fill(escenario.consulta);
  await expect(direcciones).toBeVisible();
  await expect(
    direcciones.locator("option").filter({ hasText: escenario.etiqueta }),
  ).toHaveCount(1);
  await direcciones.selectOption({ label: escenario.etiqueta });
  await expect
    .poll(() => camposDeUbicacion(page))
    .toEqual({
      domicilioId: escenario.domicilioId,
      lugarId: null,
      calleId: null,
      consulta: null,
    });

  await consulta.fill(`${escenario.consulta} modificada`);
  await expect
    .poll(() => camposDeUbicacion(page))
    .toEqual({
      domicilioId: null,
      lugarId: null,
      calleId: null,
      consulta: null,
    });
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  await expect(consulta).toHaveValue("");

  await consulta.fill(escenario.consulta);
  await expect(direcciones).toBeVisible();
  await direcciones.selectOption({ label: escenario.etiqueta });
  await page.getByLabel("Tipo de incidencia").selectOption("BACHE");
  await expect(
    page.getByText("Hay 1 reporte abierto similar en este lugar:"),
  ).toBeVisible();
  await expect(
    page.getByText(escenario.folioSimilar, { exact: false }),
  ).toBeVisible();

  await expect
    .poll(() => camposDeUbicacion(page))
    .toEqual({
      domicilioId: escenario.domicilioId,
      lugarId: null,
      calleId: null,
      consulta: null,
    });
  await page
    .getByLabel("Descripción")
    .fill("Bache frente al parque de la colonia");
  await page.getByRole("button", { name: "Registrar reporte" }).click();
  await page.waitForURL(/\/reportes\/detalle\//);

  const guardado = await leerUbicacionDeReporte(idDelReporteEnLaRuta(page));
  expect(guardado).toEqual({
    domicilioId: escenario.domicilioId,
    lugarId: escenario.coloniaId,
    calleId: escenario.calleId,
    numero: "42-B",
  });
});

test("el alta por lugar y calle sigue funcionando con JavaScript desactivado", async ({
  browser,
}) => {
  const contextoConSesion = await browser.newContext();
  const paginaConSesion = await contextoConSesion.newPage();
  await accederAMotul(paginaConSesion);
  const estadoDeSesion = await contextoConSesion.storageState();
  await contextoConSesion.close();

  const contexto = await browser.newContext({
    javaScriptEnabled: false,
    storageState: estadoDeSesion,
  });
  const page = await contexto.newPage();

  try {
    await abrirAltaDeReporte(page);
    await page
      .getByLabel("Lugar", { exact: true })
      .selectOption(escenario.coloniaId);
    await page
      .getByLabel("Calle", { exact: true })
      .selectOption(escenario.calleId);
    await page.getByLabel("Tipo de incidencia").selectOption("BACHE");
    await page.getByLabel("Descripción").fill("Bache reportado sin JavaScript");
    await page.getByRole("button", { name: "Registrar reporte" }).click();
    await page.waitForURL(/\/reportes\/detalle\//);

    const guardado = await leerUbicacionDeReporte(idDelReporteEnLaRuta(page));
    expect(guardado).toEqual({
      domicilioId: null,
      lugarId: escenario.coloniaId,
      calleId: escenario.calleId,
      numero: null,
    });
  } finally {
    await contexto.close();
  }
});
