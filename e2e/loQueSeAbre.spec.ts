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

    // S2 de `territorio-pendientes`: en el celular el panel del domicilio
    // salia despues de la lista. La ultima fila obliga a bajar para tocarla.
    test("un domicilio de la lista abre su panel a la vista", async ({
      page,
    }) => {
      await accederAMotul(page);
      await page.goto(urlDe("motul", lugar("domicilios")));

      await page
        .getByRole("link", { name: /Calle larga \d+/ })
        .last()
        .click();

      await expect(page).toHaveURL(/#panel-de-domicilio$/);
      const panel = page.locator("#panel-de-domicilio");
      await expect(panel).toBeInViewport();
      await expect(
        panel.getByRole("heading", { name: /Calle larga \d+/ }),
      ).toBeInViewport();
    });
    // S2 de `territorio-formularios`: dentro del panel angosto los campos
    // de la correccion median 340 px; la correccion es su propia vista.
    test("Corregir abre la correccion a lo ancho y a la vista", async ({
      page,
    }) => {
      await accederAMotul(page);
      await page.goto(urlDe("motul", lugar("domicilios")));
      await page
        .getByRole("link", { name: /Calle larga \d+/ })
        .last()
        .click();

      await page
        .locator("#panel-de-domicilio")
        .getByRole("link", { name: "Corregir" })
        .click();

      await expect(page).toHaveURL(
        /accion=corregirDomicilio.*#panel-de-correccion$/,
      );
      const correccion = page.locator("#panel-de-correccion");
      await expect(correccion).toBeInViewport();
      await expect(
        correccion.getByRole("heading", { name: /^Corregir Calle larga \d+/ }),
      ).toBeInViewport();
      await expect(page.locator("#panel-de-domicilio")).toHaveCount(0);

      const calle = await page.locator("#correccion-calle-id").boundingBox();
      if (!calle) throw new Error("La calle de la correccion no se pinto.");
      expect(calle.width).toBeGreaterThanOrEqual(
        viewport.width >= 1024 ? 600 : 300,
      );
    });

    test("una correccion rechazada vuelve a su vista con lo capturado", async ({
      page,
    }) => {
      await accederAMotul(page);
      await page.goto(urlDe("motul", lugar("domicilios")));
      await page
        .getByRole("link", { name: /Calle larga \d+/ })
        .last()
        .click();
      await page
        .locator("#panel-de-domicilio")
        .getByRole("link", { name: "Corregir" })
        .click();

      // La misma calle como transversal de si misma pasa el formulario y
      // la frena `TransversalRepetidaError` en el servidor.
      const calleId = await page.locator("#correccion-calle-id").inputValue();
      await page.getByLabel("Número", { exact: true }).fill("C-17");
      await page
        .getByLabel("Entre calle", { exact: true })
        .selectOption(calleId);
      await page.getByLabel("Referencia", { exact: true }).fill("Portón verde");
      await page.getByRole("button", { name: "Guardar cambios" }).click();

      await expect(
        page.getByText(
          "Las calles del domicilio deben ser distintas entre sí.",
        ),
      ).toBeVisible();
      await expect(page).toHaveURL(/accion=corregirDomicilio/);
      expect(page.url()).toMatch(/[?&]borrador=[0-9a-f-]{36}/);
      await expect(page.locator("#panel-de-correccion")).toBeVisible();
      await expect(page.getByLabel("Número", { exact: true })).toHaveValue(
        "C-17",
      );
      await expect(page.getByLabel("Entre calle", { exact: true })).toHaveValue(
        calleId,
      );
      await expect(page.getByLabel("Referencia", { exact: true })).toHaveValue(
        "Portón verde",
      );
    });
  });
}

test("sin JavaScript, la correccion abre desde el panel y vuelve con lo capturado", async ({
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
    await page.goto(urlDe("motul", lugar("domicilios")));
    await page
      .getByRole("link", { name: /Calle larga \d+/ })
      .last()
      .click();
    await page
      .locator("#panel-de-domicilio")
      .getByRole("link", { name: "Corregir" })
      .click();
    await expect(page.locator("#panel-de-correccion")).toBeVisible();

    const calleId = await page.locator("#correccion-calle-id").inputValue();
    await page.getByLabel("Entre calle", { exact: true }).selectOption(calleId);
    await page.getByLabel("Referencia", { exact: true }).fill("Sin script");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page).toHaveURL(/accion=corregirDomicilio/);
    await expect(page.locator("#panel-de-correccion")).toBeVisible();
    await expect(page.getByLabel("Referencia", { exact: true })).toHaveValue(
      "Sin script",
    );
  } finally {
    await contexto.close();
  }
});
