import { expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo } from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * El titulo que ve la persona en la pestana, el historial y los marcadores.
 * `titulos.test.ts` garantiza que cada pantalla lo declare; aqui se ve lo
 * que el navegador renderiza de verdad, plantilla incluida.
 */
const PANTALLAS: ReadonlyArray<readonly [string, string]> = [
  ["/", "Inicio"],
  ["/padron", "Padrón"],
  ["/padron/alta", "Alta de persona"],
  ["/territorio", "Territorio"],
  ["/territorio/domicilios", "Domicilios"],
  ["/mapa-operativo", "Mapa operativo"],
  ["/reportes", "Reportes"],
  ["/reportes/alta", "Nuevo reporte"],
  ["/intervenciones", "Intervenciones"],
  ["/constancias", "Constancias"],
  ["/constancias/emitir", "Emitir constancia"],
  ["/constancias/configuracion", "Configuración de constancias"],
  ["/marca", "Marca"],
];

test.beforeEach(liberarVentanaDeRitmo);

test("la pantalla de acceso lleva su propio titulo", async ({ page }) => {
  await page.goto(urlDe("motul", "/acceso"));

  await expect(page).toHaveTitle("Acceso · XULA SIGMA");
});

test("el helper espera la respuesta demorada sin reenviar el acceso", async ({
  page,
}) => {
  // La coreografia demora el sign-in 7s a proposito: la coordinacion no debe
  // reenviar el formulario ni esperar el evento `load` del destino.
  test.setTimeout(60_000);
  page.setDefaultTimeout(1_000);
  page.setDefaultNavigationTimeout(15_000);

  const endpointDeAcceso = urlDe("motul", "/api/auth/sign-in/email");
  const urlDeLaPaginaDeAcceso = urlDe("motul", "/acceso");
  let solicitudesDeAcceso = 0;
  let demoraDeAcceso = 0;
  let navegacionesDeAcceso = 0;

  page.on("request", (solicitud) => {
    if (
      solicitud.isNavigationRequest() &&
      solicitud.frame() === page.mainFrame() &&
      solicitud.method() === "GET" &&
      solicitud.url() === urlDeLaPaginaDeAcceso
    ) {
      navegacionesDeAcceso++;
    }
  });

  await page.route(endpointDeAcceso, async (ruta) => {
    if (ruta.request().method() !== "POST") {
      await ruta.continue();
      return;
    }

    solicitudesDeAcceso++;
    const inicio = Date.now();
    await new Promise<void>((resolver) => setTimeout(resolver, 7_000));
    demoraDeAcceso = Date.now() - inicio;
    await ruta.continue();
  });

  const respuestaDeAcceso = page.waitForResponse(
    (respuesta) =>
      respuesta.url() === endpointDeAcceso &&
      respuesta.request().method() === "POST",
    { timeout: 20_000 },
  );

  await accederAMotul(page);

  expect(navegacionesDeAcceso).toBe(1);
  expect(solicitudesDeAcceso).toBe(1);
  expect(demoraDeAcceso).toBeGreaterThan(5_000);
  expect((await respuestaDeAcceso).status()).toBe(200);
  expect(page.url()).toBe(urlDe("motul"));
});

test("cada pantalla del panel lleva su titulo de ruta", async ({ page }) => {
  await page.route("https://*.tile.openstreetmap.org/**", (ruta) =>
    ruta.abort(),
  );
  await accederAMotul(page);

  for (const [ruta, titulo] of PANTALLAS) {
    await page.goto(urlDe("motul", ruta));
    await expect(page, ruta).toHaveTitle(`${titulo} · XULA SIGMA`);
  }
});
