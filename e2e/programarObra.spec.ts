import { expect, type Page, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * S16 y S17 de `intervenciones-ux` contra la aplicacion construida y Postgres
 * real: al programar obra desde el detalle del reporte, la pantalla confirma
 * con un aviso y un enlace «Ver la obra»; al volver, el reporte muestra la
 * obra que tiene -sin dejar de ofrecer una segunda- y el formulario dice que
 * la fecha sera hoy y que el lugar se copia del reporte.
 *
 * El escenario es el de `calles.fixture` con raiz `comisaria`, mismo motivo
 * que `reportesDetalle.spec.ts`: `calles.spec.ts` ya ocupa la unica cabecera
 * de Motul. Trae un reporte `RECIBIDO` con calle, que es el caso del alta.
 */
let escenario: Scenario;

test.beforeAll(async () => {
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
});

test.beforeEach(liberarVentanaDeRitmo);

const DISTINTIVO_DE_OBRA =
  /\/reportes\/detalle\/[0-9a-f-]{36}\?obra=[0-9a-f-]{36}$/;

const abrirElDetalle = async (page: Page): Promise<void> => {
  await page.goto(urlDe("motul", `/reportes/detalle/${escenario.reporte}`));
  await expect(page.getByRole("heading", { name: "Acciones" })).toBeVisible();
};

const desplegableDeProgramar = (page: Page) =>
  page.locator("details", {
    has: page.locator("summary", { hasText: "Programar obra…" }),
  });

/**
 * La obra creada es la ultima del municipio: la fecha de ocurrencia es hoy en
 * Merida y la descripcion lleva la marca de la corrida.
 */
const programarObra = async (
  page: Page,
  descripcion: string,
): Promise<void> => {
  const desplegable = desplegableDeProgramar(page);
  await desplegable.locator("summary").click();
  await page.getByLabel("Tipo de obra").selectOption("BACHE");
  await page.getByLabel("Descripción del trabajo").fill(descripcion);
  await page
    .getByRole("button", { name: "Programar obra", exact: true })
    .click();
};

test("programar obra confirma con un aviso y un enlace a la obra creada", async ({
  page,
}) => {
  await accederAMotul(page);
  await abrirElDetalle(page);
  await programarObra(page, `Bacheo de la calle 26, corrida ${Date.now()}`);

  // El id de la obra viaja en `?obra=`; sale del servidor, no del formulario.
  await expect(page).toHaveURL(DISTINTIVO_DE_OBRA);
  const obraId = new URL(page.url()).searchParams.get("obra");
  expect(obraId).toBeTruthy();

  await expect(page.getByText("La obra quedó programada.")).toBeVisible();
  const enlace = page.getByRole("link", { name: "Ver la obra" });
  await expect(enlace).toHaveAttribute("href", `/intervenciones/${obraId}`);

  await enlace.click();
  await expect(page).toHaveURL(new RegExp(`/intervenciones/${obraId}$`));
});

test("al volver, el reporte muestra la obra que ya tiene y sigue ofreciendo otra", async ({
  page,
}) => {
  await accederAMotul(page);
  await abrirElDetalle(page);
  await programarObra(page, `Bacheo repetido de la calle 26 ${Date.now()}`);
  await expect(page).toHaveURL(DISTINTIVO_DE_OBRA);

  await abrirElDetalle(page);
  await desplegableDeProgramar(page).locator("summary").click();

  await expect(
    page.getByText("Este reporte ya tiene una obra programada."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver la obra" })).toBeVisible();
  // S16 pide mostrar la obra, no prohibir una segunda sobre el mismo reporte.
  await expect(
    page.getByRole("button", { name: "Programar obra", exact: true }),
  ).toBeVisible();
});

test("un ?obra= inventado no produce aviso ni enlace", async ({ page }) => {
  await accederAMotul(page);
  await page.goto(
    urlDe(
      "motul",
      `/reportes/detalle/${escenario.reporte}?obra=99999999-9999-4999-8999-999999999999`,
    ),
  );

  await expect(page.getByRole("heading", { name: "Acciones" })).toBeVisible();
  await expect(page.getByText("La obra quedó programada.")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ver la obra" })).toHaveCount(0);
});

test("el formulario dice que la fecha sera hoy y que el lugar se copia del reporte", async ({
  page,
}) => {
  await accederAMotul(page);
  await abrirElDetalle(page);
  await desplegableDeProgramar(page).locator("summary").click();

  await expect(
    page.getByText(
      "La fecha de la obra será hoy y el lugar se copia del reporte.",
    ),
  ).toBeVisible();
});
