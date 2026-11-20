import { type BrowserContext, expect, type Page, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { prepararEscenario, type Scenario } from "./calles.fixture";
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
 *
 * **El id del reporte no lo expone la fixture**: `escenario.reporte` es el
 * NOMBRE de la calle del reporte (`calles.fixture.ts`, `reporte:
 * nombres.reporte`), no su uuid, y `insertarReporte` no devuelve el id. Se
 * llega por el folio, igual que `reportesDetalle.spec.ts`, y el id se lee de
 * la URL ya resuelta: usar el nombre como id daba un 404 legitimo del
 * detalle (el `id` de la ruta se valida como uuid).
 */
let escenario: Scenario;
/** La sesion se abre una vez: cuatro accesos seguidos agotan el ritmo de
 * `/sign-in` y dejan sin entrar al spec siguiente de la corrida. */
let cookiesDeSesion: Awaited<
  ReturnType<BrowserContext["storageState"]>
>["cookies"] = [];

test.beforeAll(async ({ browser }) => {
  const contexto = await browser.newContext();
  try {
    const page = await contexto.newPage();
    await accederAMotul(page);
    ({ cookies: cookiesDeSesion } = await contexto.storageState());
  } finally {
    await contexto.close();
  }
});

/**
 * Un reporte propio por test: el escenario trae uno `RECIBIDO` con calle, y
 * compartirlo haria que el segundo test encontrara la obra que programo el
 * primero -dos obras y el aviso en plural- y que el orden de la corrida
 * decidiera lo que cada test prueba.
 */
test.beforeEach(async ({ context }) => {
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
  await context.addCookies(cookiesDeSesion);
});

const idDeLaRuta = (page: Page): string => {
  const id = new URL(page.url()).pathname.split("/").at(-1);
  if (!id) throw new Error("La URL del detalle no trae el id del reporte.");
  return id;
};

const desplegableDeProgramar = (page: Page) =>
  page.locator("details", {
    has: page.locator("summary", { hasText: "Programar obra…" }),
  });

/**
 * Abre el detalle del reporte del escenario y devuelve su id. La URL se
 * afirma como uuid: un id que no lo sea da la pantalla de «no encontrado» de
 * la pagina -que es correcta- y no el detalle que estos tests necesitan.
 */
const abrirElDetalle = async (page: Page): Promise<string> => {
  await page.goto(urlDe("motul", `/reportes?q=${escenario.folio}`));
  await page.getByRole("link", { name: new RegExp(escenario.folio) }).click();
  await expect(page).toHaveURL(/\/reportes\/detalle\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Acciones" })).toBeVisible();

  return idDeLaRuta(page);
};

const programarObra = async (
  page: Page,
  descripcion: string,
): Promise<void> => {
  await desplegableDeProgramar(page).locator("summary").click();
  await page.getByLabel("Tipo de obra").selectOption("BACHE");
  await page.getByLabel("Descripción del trabajo").fill(descripcion);
  await page
    .getByRole("button", { name: "Programar obra", exact: true })
    .click();
};

test("programar obra confirma con un aviso y un enlace a la obra creada", async ({
  page,
}) => {
  const reporteId = await abrirElDetalle(page);
  await programarObra(page, `Bacheo de la calle 26, corrida ${Date.now()}`);

  // El id de la obra viaja en `?obra=`; sale del servidor, no del formulario.
  await expect(page).toHaveURL(
    new RegExp(`/reportes/detalle/${reporteId}\\?obra=[0-9a-f-]{36}$`),
  );
  const obraId = new URL(page.url()).searchParams.get("obra");
  if (!obraId) throw new Error("La vuelta no trae el id de la obra creada.");

  await expect(page.getByText("La obra quedó programada.")).toBeVisible();
  const enlace = page.getByRole("link", { name: "Ver la obra" });
  await expect(enlace).toHaveAttribute("href", `/intervenciones/${obraId}`);

  await enlace.click();
  await expect(page).toHaveURL(new RegExp(`/intervenciones/${obraId}$`));
});

test("al volver, el reporte muestra la obra que ya tiene y sigue ofreciendo otra", async ({
  page,
}) => {
  await abrirElDetalle(page);
  await programarObra(page, `Bacheo repetido de la calle 26 ${Date.now()}`);
  await expect(page.getByText("La obra quedó programada.")).toBeVisible();

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
  const reporteId = await abrirElDetalle(page);
  await page.goto(
    urlDe(
      "motul",
      `/reportes/detalle/${reporteId}?obra=99999999-9999-4999-8999-999999999999`,
    ),
  );

  await expect(page.getByRole("heading", { name: "Acciones" })).toBeVisible();
  await expect(page.getByText("La obra quedó programada.")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ver la obra" })).toHaveCount(0);
});

test("el formulario dice que la fecha sera hoy y que el lugar se copia del reporte", async ({
  page,
}) => {
  await abrirElDetalle(page);
  await desplegableDeProgramar(page).locator("summary").click();

  await expect(
    page.getByText(
      "La fecha de la obra será hoy y el lugar se copia del reporte.",
    ),
  ).toBeVisible();
});
