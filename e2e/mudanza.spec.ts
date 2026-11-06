import { expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import {
  type EscenarioDeMudanza,
  leerDomicilioVigente,
  prepararEscenarioDeMudanza,
} from "./mudanza.fixture";
import { urlDe } from "./municipios";

let escenario: EscenarioDeMudanza;

test.beforeAll(async () => {
  escenario = await prepararEscenarioDeMudanza();
});

test("la mudanza elige el domicilio con el mismo buscador de direcciones que reportes", async ({
  page,
}) => {
  const personaId = escenario.personaConJavaScriptId;
  await accederAMotul(page);
  await page.goto(urlDe("motul", `/padron/${personaId}`));

  const consulta = page.getByLabel("Buscar una dirección registrada");
  await consulta.fill(`sin resultados ${escenario.consulta}`);
  // Sin lugar y calle en este formulario, el aviso no ofrece esa salida.
  await expect(
    page.getByText("No se encontraron direcciones.", { exact: true }),
  ).toBeVisible();

  await consulta.fill(escenario.consulta);
  const domicilios = page.getByLabel("Domicilio", { exact: true });
  await expect(
    domicilios.locator("option").filter({ hasText: escenario.etiqueta }),
  ).toHaveCount(1);
  await domicilios.selectOption({ label: escenario.etiqueta });
  // La página ya está en `/padron/{id}`: esperar la URL no espera el POST.
  await Promise.all([
    page.waitForResponse(
      (respuesta) =>
        respuesta.request().method() === "POST" &&
        new URL(respuesta.url()).pathname === `/padron/${personaId}`,
    ),
    page.getByRole("button", { name: "Registrar mudanza" }).click(),
  ]);

  await expect
    .poll(() => leerDomicilioVigente(personaId))
    .toBe(escenario.domicilioId);
});

test("sin JavaScript la mudanza se registra con el select del municipio", async ({
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
  const personaId = escenario.personaSinJavaScriptId;

  try {
    await page.goto(urlDe("motul", `/padron/${personaId}`));
    await expect(
      page.getByLabel("Buscar una dirección registrada"),
    ).toHaveCount(0);
    await page
      .getByLabel("Domicilio", { exact: true })
      .selectOption(escenario.domicilioId);
    await page.getByRole("button", { name: "Registrar mudanza" }).click();

    await expect
      .poll(() => leerDomicilioVigente(personaId))
      .toBe(escenario.domicilioId);
  } finally {
    await contexto.close();
  }
});

test("con JavaScript lento, el domicilio elegido antes de hidratar se conserva y se guarda", async ({
  page,
}) => {
  const personaId = escenario.personaAntesDeHidratarId;
  await accederAMotul(page);

  let liberarScripts: () => void = () => {};
  const scriptsLiberados = new Promise<void>((resolve) => {
    liberarScripts = resolve;
  });
  await page.route("**/_next/static/chunks/**", async (ruta) => {
    await scriptsLiberados;
    await ruta.continue();
  });

  try {
    await page.goto(urlDe("motul", `/padron/${personaId}`), {
      waitUntil: "commit",
    });
    // Sin hidratar todavia: la lista del HTML inicial ya permite elegir.
    await page
      .getByLabel("Domicilio", { exact: true })
      .selectOption(escenario.domicilioId);
  } finally {
    liberarScripts();
  }
  await page.waitForLoadState("load");

  await expect(page.getByLabel("Domicilio", { exact: true })).toHaveValue(
    escenario.domicilioId,
  );
  await expect(page.getByLabel("Buscar una dirección registrada")).toHaveCount(
    0,
  );
  await Promise.all([
    page.waitForResponse(
      (respuesta) =>
        respuesta.request().method() === "POST" &&
        new URL(respuesta.url()).pathname === `/padron/${personaId}`,
    ),
    page.getByRole("button", { name: "Registrar mudanza" }).click(),
  ]);

  await expect
    .poll(() => leerDomicilioVigente(personaId))
    .toBe(escenario.domicilioId);
});
