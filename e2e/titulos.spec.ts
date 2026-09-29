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
