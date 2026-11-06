import { expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import {
  type EscenarioDeMudanza,
  leerDomicilioPorNumero,
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
    page.getByRole("button", { name: "Registrar domicilio actual" }).click(),
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
    await page
      .getByRole("button", { name: "Registrar domicilio actual" })
      .click();

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
    page.getByRole("button", { name: "Registrar domicilio actual" }).click(),
  ]);

  await expect
    .poll(() => leerDomicilioVigente(personaId))
    .toBe(escenario.domicilioId);
});

test("en el buscador, enviar sin elegir domicilio no sale de la ficha ni registra nada", async ({
  page,
}) => {
  const personaId = escenario.personaSinElegirId;
  await accederAMotul(page);
  await page.goto(urlDe("motul", `/padron/${personaId}`));

  const consulta = page.getByLabel("Buscar una dirección registrada");
  await expect(consulta).toBeVisible();
  // El buscador también es un POST (su Server Action); la mudanza es el
  // único que lleva el id de la persona.
  let envios = 0;
  page.on("request", (pedido) => {
    if (pedido.method() === "POST" && pedido.postData()?.includes(personaId))
      envios += 1;
  });

  const enviar = page.getByRole("button", {
    name: "Registrar domicilio actual",
  });
  await enviar.click();
  // Escribir no basta: el formulario recibe el id de la opción elegida.
  await consulta.fill(escenario.consulta);
  await expect(
    page.getByLabel("Domicilio", { exact: true }).locator("option"),
  ).not.toHaveCount(0);
  await enviar.click();

  await expect(consulta).toHaveJSProperty(
    "validationMessage",
    "Elija una dirección de la lista.",
  );
  await expect(page).toHaveURL(new RegExp(`/padron/${personaId}$`));
  expect(envios).toBe(0);
  expect(await leerDomicilioVigente(personaId)).toBeNull();
});

test("desde la ficha se registra un domicilio nuevo y se vuelve a ella para asignarlo", async ({
  page,
}) => {
  const personaId = escenario.personaIdaYVueltaId;
  const numero = `${escenario.domicilioId.slice(0, 4)}-N`;
  await accederAMotul(page);
  await page.goto(urlDe("motul", `/padron/${personaId}`));

  await page
    .getByRole("link", { name: "Registrar un domicilio nuevo" })
    .click();
  await expect(page).toHaveURL(/\/territorio\?.*accion=domicilio/);
  await expect(page.getByRole("link", { name: "Cancelar" })).toHaveAttribute(
    "href",
    `/padron/${personaId}`,
  );

  await page
    .getByLabel("Calle", { exact: true })
    .selectOption(escenario.calleId);
  await page.getByLabel("Número", { exact: true }).fill(numero);
  await page.getByLabel("Colonia (opcional)").selectOption(escenario.coloniaId);
  await page
    .getByRole("button", { name: "Registrar domicilio", exact: true })
    .click();

  // El alta exitosa vuelve a la ficha, no al árbol de territorio.
  await expect(page).toHaveURL(
    new RegExp(`/padron/${personaId}\\?ok=domicilio-creado$`),
  );
  await expect(
    page.getByText(
      "Domicilio registrado. Búsquelo abajo para asignarlo a esta persona.",
    ),
  ).toBeVisible();
  const nuevoId = await leerDomicilioPorNumero(escenario.calleId, numero);
  expect(nuevoId).not.toBeNull();

  await page
    .getByLabel("Buscar una dirección registrada")
    .fill(escenario.consulta);
  await page
    .getByLabel("Domicilio", { exact: true })
    .selectOption({ label: escenario.etiquetaCon(numero) });
  await Promise.all([
    page.waitForResponse(
      (respuesta) =>
        respuesta.request().method() === "POST" &&
        new URL(respuesta.url()).pathname === `/padron/${personaId}`,
    ),
    page.getByRole("button", { name: "Registrar domicilio actual" }).click(),
  ]);

  await expect.poll(() => leerDomicilioVigente(personaId)).toBe(nuevoId);
});
