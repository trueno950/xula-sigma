import { expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * C1 de `odd/tasks/territorio-ux.md` (S7): un enlace a una calle sin
 * `?vista=calles` caia en la pestana Colonias y la calle no se abria, sin
 * ningun aviso. El panel de la calle solo existe en Calles, asi que el
 * `?calle=` la implica.
 */
let escenario: Scenario;

test.beforeAll(async () => {
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
});

test.beforeEach(liberarVentanaDeRitmo);

test("un enlace con ?calle= y sin ?vista= abre el panel de la calle", async ({
  page,
}) => {
  await accederAMotul(page);

  const respuesta = await page.goto(
    urlDe(
      "motul",
      `/territorio?raiz=${escenario.origenId}&calle=${escenario.reporteCalleId}`,
    ),
  );

  expect(respuesta?.status()).toBe(200);
  const panel = page.locator("#panel-de-calle");
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("heading", { name: escenario.reporte }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /^Calles: / })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("una calle de otro municipio sigue siendo 404", async ({ page }) => {
  await accederAMotul(page);

  const respuesta = await page.goto(
    urlDe(
      "motul",
      `/territorio?raiz=${escenario.origenId}&calle=60000000-0000-4000-8000-000000000001`,
    ),
  );

  expect(respuesta?.status()).toBe(404);
});
