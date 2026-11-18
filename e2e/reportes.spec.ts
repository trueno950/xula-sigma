import { randomUUID } from "node:crypto";
import {
  type Browser,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";
import postgres from "postgres";
import { accederAMotul } from "./acceder";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { MUNICIPIOS, urlDe } from "./municipios";

/**
 * S1 de `gestion-municipal`, contra la aplicacion construida y Postgres real:
 * el administrador cambia el umbral de atraso, la bandeja marca el reporte
 * con sus dias y el filtro lo aisla, el mapa publica el conteo, un valor
 * fuera de rango vuelve con un mensaje para la operadora, y sin JavaScript se
 * guarda igual.
 *
 * El escenario de `calles.fixture` -con raiz `comisaria`, porque
 * `calles.spec.ts` ya ocupa la unica cabecera de Motul- trae un reporte
 * `RECIBIDO`. Su fecha de registro se envejece por SQL y no por la UI: la
 * pantalla no permite capturar el pasado, y lo que este spec verifica es el
 * umbral, no el alta.
 */

const DIAS_TRANSCURRIDOS = 40;
const ETIQUETA_DEL_UMBRAL = "Días para marcar un reporte como atrasado";

let escenario: Scenario;

const envejecerReporte = async (folio: string, dias: number) => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");

  const app = postgres(url, { max: 1 });
  try {
    await app.begin(async (tx) => {
      await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;
      await tx`
        UPDATE reportes
           SET registrado_en = now() - ${dias} * interval '1 day'
         WHERE folio = ${folio}
      `;
    });
  } finally {
    await app.end();
  }
};

test.beforeAll(async () => {
  await liberarVentanaDeRitmo();
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
  await envejecerReporte(escenario.folio, DIAS_TRANSCURRIDOS);
});

test.beforeEach(liberarVentanaDeRitmo);

/**
 * Guardar y comprobar que se guardo. La espera es la respuesta del POST y no
 * la URL: la URL ya es la del formulario antes de enviarlo, asi que esperarla
 * pasaria al instante y la navegacion siguiente abortaria el envio. El valor
 * del campo despues del redirect es el que el servidor volvio a leer.
 */
const guardarUmbral = async (page: Page, dias: string): Promise<void> => {
  await page.goto(urlDe("motul", "/reportes/configuracion"));
  const respuesta = page.waitForResponse(
    (candidata) =>
      candidata.request().method() === "POST" &&
      candidata.url().includes("/reportes/configuracion"),
  );
  await page.getByLabel(ETIQUETA_DEL_UMBRAL).fill(dias);
  await page.getByRole("button", { name: "Guardar" }).click();
  await respuesta;

  await expect(page).not.toHaveURL(/error=/);
  await expect(page.getByLabel(ETIQUETA_DEL_UMBRAL)).toHaveValue(dias);
};

const abrirBandeja = async (page: Page, consulta = ""): Promise<void> => {
  await page.goto(urlDe("motul", `/reportes${consulta}`));
};

// La fila lleva el atraso dos veces en el HTML -la celda de escritorio y la
// linea del telefono-, y una de las dos esta siempre oculta.
const insigniaDeAtraso = (page: Page) =>
  page.getByText("Atrasado · 40 días").filter({ visible: true });

// S3: dejo de ser una casilla dentro del formulario y paso a ser el
// interruptor de la banda, que envia el GET el solo.
const filtroDeAtrasados = (page: Page) =>
  page.getByRole("button", { name: /Solo atrasados/ });

test("el administrador cambia el umbral y la bandeja y el mapa lo reflejan", async ({
  page,
}) => {
  await accederAMotul(page);

  await guardarUmbral(page, "30");
  await abrirBandeja(page);

  await expect(insigniaDeAtraso(page)).toBeVisible();

  await filtroDeAtrasados(page).click();
  await expect(page).toHaveURL(/atrasados=1/);
  await expect(insigniaDeAtraso(page)).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(escenario.folio) }),
  ).toBeVisible();

  await page.goto(urlDe("motul", "/mapa-operativo"));
  const conteoDeAtrasados = page.getByRole("list", {
    name: "Conteo de atrasados",
  });
  await expect(conteoDeAtrasados).toBeVisible();
  // El conteo de la leyenda es el de los hechos marcados, no un numero
  // aparte que pueda divergir de lo que el pin muestra.
  const marcados = await page.getByText(/Atrasado · 40 días/).count();
  expect(marcados).toBeGreaterThan(0);
  await expect(conteoDeAtrasados).toContainText(String(marcados));

  // Con un umbral mayor que los dias transcurridos el mismo reporte deja de
  // estar atrasado, y el filtro no devuelve nada: el corte lo resolvio el
  // servidor con el umbral nuevo.
  await guardarUmbral(page, "60");
  await abrirBandeja(page);
  await expect(insigniaDeAtraso(page)).toHaveCount(0);

  await abrirBandeja(page, "?atrasados=1");
  await expect(
    page.getByText("Sin resultados para solo atrasados."),
  ).toBeVisible();
});

test("un valor fuera de rango no se guarda y vuelve con un mensaje para la operadora", async ({
  page,
}) => {
  await accederAMotul(page);
  await guardarUmbral(page, "20");

  await page.goto(urlDe("motul", "/reportes/configuracion"));
  await page.getByLabel(ETIQUETA_DEL_UMBRAL).fill("91");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/error=/);
  await expect(page.getByText("El umbral va de 1 a 90 días.")).toBeVisible();
  await expect(page.getByLabel(ETIQUETA_DEL_UMBRAL)).toHaveValue("20");
});

test("sin JavaScript el umbral se guarda igual", async ({ browser }) => {
  const contexto = await contextoSinJavaScript(browser);
  try {
    const page = await contexto.newPage();
    await page.goto(urlDe("motul", "/reportes/configuracion"));
    await page.getByLabel(ETIQUETA_DEL_UMBRAL).fill("45");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page).toHaveURL(/\/reportes\/configuracion$/);
    await expect(page.getByLabel(ETIQUETA_DEL_UMBRAL)).toHaveValue("45");
  } finally {
    await contexto.close();
  }
});

test("un rol que no administra no ve el formulario ni el enlace", async ({
  browser,
  page,
}) => {
  const correo = `umbral-${randomUUID()}@example.com`;
  await accederAMotul(page);
  await guardarUmbral(page, "20");
  await page.goto(urlDe("motul", "/usuarios/alta"));
  await page.getByLabel("Nombre completo").fill("Operadora del umbral");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Rol").selectOption("OPERADOR");
  await page.getByRole("button", { name: "Dar de alta" }).click();
  await page.waitForURL(/\/usuarios\?clave=/);
  const clave = (
    await page
      .getByRole("region", { name: "Contraseña temporal" })
      .locator("p")
      .nth(1)
      .innerText()
  ).trim();

  // Contexto aparte y no "cerrar sesion": la cookie del administrador no
  // tiene que sobrevivir a la comprobacion de que la operadora no ve el
  // formulario.
  const contexto = await browser.newContext();
  try {
    const operadora = await contexto.newPage();
    await accederComo(operadora, correo, clave);

    await abrirBandeja(operadora);
    await expect(
      operadora.getByRole("link", { name: "Configurar atraso" }),
    ).toHaveCount(0);
    await expect(insigniaDeAtraso(operadora)).toBeVisible();

    await operadora.goto(urlDe("motul", "/reportes/configuracion"));
    await expect(
      operadora.getByText(
        "Su rol no tiene permiso para configurar los reportes.",
      ),
    ).toBeVisible();
    await expect(operadora.getByLabel(ETIQUETA_DEL_UMBRAL)).toHaveCount(0);
  } finally {
    await contexto.close();
  }
});

const cajaDe = async (locator: Locator) => {
  const caja = await locator.boundingBox();
  if (!caja) throw new Error("El elemento no está en pantalla.");
  return caja;
};

const abrirAlta = async (page: Page): Promise<void> => {
  await page.goto(urlDe("motul", "/reportes/alta"));
  await expect(
    page.getByRole("heading", { name: "Registrar reporte" }),
  ).toBeVisible();
};

/** Texto que el `<select>` muestra elegido: el marcador o la opcion de la persona. */
const elegidoEn = (page: Page, etiqueta: string): Promise<string> =>
  page
    .getByLabel(etiqueta, { exact: true })
    .evaluate((select) =>
      select instanceof HTMLSelectElement
        ? (select.selectedOptions[0]?.textContent ?? "")
        : "",
    );

test("el alta ordena tipo, ubicación y detalle, y dice qué campos son obligatorios", async ({
  page,
}) => {
  await accederAMotul(page);
  await abrirAlta(page);

  const tipo = await cajaDe(page.getByLabel("Tipo de incidencia"));
  const lugar = await cajaDe(page.getByLabel("Lugar", { exact: true }));
  const calle = await cajaDe(page.getByLabel("Calle", { exact: true }));
  const descripcion = await cajaDe(page.getByLabel("Descripción"));
  const referencia = await cajaDe(
    page.getByLabel("Referencia", { exact: true }),
  );

  expect(tipo.y).toBeLessThan(lugar.y);
  expect(lugar.y).toBeLessThan(calle.y);
  expect(calle.y).toBeLessThan(descripcion.y);
  expect(descripcion.y).toBeLessThan(referencia.y);

  await expect(
    page.getByText(
      "Todos los campos son obligatorios, salvo la calle y la referencia.",
    ),
  ).toBeVisible();
  // La ayuda de la referencia se lee de un renglon a 390px de ancho, que es
  // donde la auditoria la midio en dos.
  await page.setViewportSize({ width: 390, height: 844 });
  const ayudaDeReferencia = await cajaDe(
    page.locator("#reporte-referencia-ayuda"),
  );
  expect(ayudaDeReferencia.height).toBeLessThan(24);
});

test("las dos formas de ubicar el reporte explican en qué se diferencian y se tocan enteras", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirAlta(page);

  for (const [opcion, explicacion] of [
    ["Lugar y calle", "Elija el lugar y, si la sabe, la calle."],
    ["Domicilio registrado", "Busque una dirección del padrón territorial."],
  ] as const) {
    const fila = await cajaDe(page.getByText(opcion, { exact: true }));
    expect(fila.height).toBeGreaterThanOrEqual(44);

    // Una linea, no dos: a 390px la explicacion se lee de un renglon.
    const ayuda = await cajaDe(page.getByText(explicacion));
    expect(ayuda.height).toBeLessThan(24);
  }
});

test("sin lugar elegido la calle pide el lugar y no ofrece «Ninguna»", async ({
  page,
}) => {
  await accederAMotul(page);
  await abrirAlta(page);

  await expect
    .poll(() => elegidoEn(page, "Calle"))
    .toBe("Elija primero el lugar");
  await expect(
    page.getByLabel("Calle", { exact: true }).locator("option", {
      hasText: "Ninguna",
    }),
  ).toHaveCount(0);
  // La lista completa sigue en el HTML: es el camino del alta sin JavaScript.
  expect(
    await page.getByLabel("Calle", { exact: true }).locator("option").count(),
  ).toBeGreaterThan(1);

  await page.getByLabel("Lugar", { exact: true }).selectOption({ index: 1 });
  await expect.poll(() => elegidoEn(page, "Calle")).toBe("Ninguna");
});

test("a 390x844 la ayuda de la descripción y el botón de envío quedan sobre la barra inferior", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirAlta(page);

  const barra = page.getByRole("navigation", { name: "Navegación principal" });

  const ayuda = page.getByText(
    "No anote nombres, teléfonos ni datos de vecinos.",
  );
  await ayuda.scrollIntoViewIfNeeded();
  const cajaDeAyuda = await cajaDe(ayuda);
  expect(cajaDeAyuda.y + cajaDeAyuda.height).toBeLessThanOrEqual(
    (await cajaDe(barra)).y,
  );

  const boton = page.getByRole("button", { name: "Registrar reporte" });
  await boton.scrollIntoViewIfNeeded();
  const cajaDeBoton = await cajaDe(boton);
  expect(cajaDeBoton.y + cajaDeBoton.height).toBeLessThanOrEqual(
    (await cajaDe(barra)).y,
  );
});

/** La sesion se abre con script; lo que se prueba despues corre sin el. */
const contextoSinJavaScript = async (browser: Browser) => {
  const conJs = await browser.newContext();
  await accederAMotul(await conJs.newPage());
  const estado = await conJs.storageState();
  await conJs.close();

  return browser.newContext({ javaScriptEnabled: false, storageState: estado });
};

const accederComo = async (
  page: Page,
  correo: string,
  clave: string,
): Promise<void> => {
  for (let intento = 0; intento < 5; intento++) {
    await page.goto(urlDe("motul", "/acceso"));
    await page.getByLabel("Correo").fill(correo);
    await page.getByLabel("Contraseña").fill(clave);
    await page.getByRole("button", { name: "Entrar" }).click();

    try {
      await page.waitForURL(urlDe("motul"), { timeout: 5_000 });
      return;
    } catch {
      await liberarVentanaDeRitmo();
      await page.waitForTimeout(3_000);
    }
  }

  throw new Error("No se pudo acceder con la cuenta nueva.");
};
