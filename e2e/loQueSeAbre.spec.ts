import { expect, type Page, test } from "@playwright/test";
import postgres from "postgres";
import { accederAMotul } from "./acceder";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S1 de `territorio-visual` (A1 de la auditoria): lo que se abre tiene que
 * quedar a la vista en el monitor del palacio y en el celular. Antes el
 * alta y el panel de calle salian debajo de la lista completa, y con
 * veintiseis calles la operadora tocaba y no veia que pasaba nada.
 *
 * Se siembra una comisaria con treinta calles mas, cada una con su
 * domicilio: las listas tienen que ser mas largas que la pantalla para que
 * la prueba distinga "arriba de la lista" de "debajo".
 */
let escenario: Scenario;
const EXTRA = 30;

const sembrarListaLarga = async (lugarId: string) => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");

  const app = postgres(url, { max: 1 });
  try {
    await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      for (let n = 1; n <= EXTRA; n += 1) {
        const [calle] = await tx<{ id: string }[]>`
          INSERT INTO calles (ayuntamiento_id, lugar_id, nombre)
          VALUES (${MUNICIPIOS.motul.id}, ${lugarId}, ${`Calle larga ${n}`})
          RETURNING id
        `;
        if (!calle) throw new Error("Falta la calle sembrada.");
        await tx`
          INSERT INTO domicilios (ayuntamiento_id, lugar_id, calle_id)
          VALUES (${MUNICIPIOS.motul.id}, ${lugarId}, ${calle.id})
        `;
      }
    });
  } finally {
    await app.end();
  }
};

test.beforeAll(async () => {
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
  await sembrarListaLarga(escenario.origenId);
});

test.beforeEach(liberarVentanaDeRitmo);

const lugar = (vista: string) =>
  `/territorio?raiz=${escenario.origenId}&nodo=${escenario.origenId}&vista=${vista}`;

const pantallas = [
  { nombre: "escritorio 1366x768", viewport: { width: 1366, height: 768 } },
  { nombre: "celular 390x844", viewport: { width: 390, height: 844 } },
];

const registrar = (page: Page) =>
  page.getByRole("link", { name: "Registrar domicilio", exact: true });

for (const { nombre, viewport } of pantallas) {
  test.describe(nombre, () => {
    test.use({ viewport });

    test("Registrar domicilio dentro del lugar abre el alta a la vista", async ({
      page,
    }) => {
      await accederAMotul(page);
      await page.goto(urlDe("motul", lugar("domicilios")));

      await registrar(page).click();

      await expect(page).toHaveURL(/accion=domicilio#panel-de-alta$/);
      const alta = page.locator("#panel-de-alta");
      await expect(alta).toBeInViewport();
      await expect(
        alta.getByRole("heading", { name: "Registrar domicilio" }),
      ).toBeInViewport();
    });

    test("Registrar domicilio en la entrada abre el alta a la vista", async ({
      page,
    }) => {
      await accederAMotul(page);
      await page.goto(urlDe("motul", "/territorio"));

      await registrar(page).click();

      await expect(page.locator("#panel-de-alta")).toBeInViewport();
    });

    test("Agregar calle abre el alta a la vista", async ({ page }) => {
      await accederAMotul(page);
      await page.goto(urlDe("motul", lugar("calles")));

      await page.getByRole("link", { name: "Agregar calle" }).click();

      await expect(page.locator("#panel-de-alta")).toBeInViewport();
    });

    test("una calle de la lista abre su panel a la vista", async ({ page }) => {
      await accederAMotul(page);
      await page.goto(urlDe("motul", lugar("calles")));

      await page.getByRole("link", { name: /Calle larga 25\b/ }).click();

      const panel = page.locator("#panel-de-calle");
      await expect(panel).toBeInViewport();
      await expect(
        panel.getByRole("heading", { name: "Calle larga 25" }),
      ).toBeInViewport();
    });
  });
}
