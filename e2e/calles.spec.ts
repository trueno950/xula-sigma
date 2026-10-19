import { expect, type Page, test } from "@playwright/test";
import {
  leerAuditoria,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { CLAVE, CORREO, urlDe } from "./municipios";

let escenario: Scenario;

test.beforeAll(async () => {
  escenario = await prepararEscenario();
});

const territorio = (lugarId: string) =>
  `/territorio?raiz=${lugarId}&nodo=${lugarId}&vista=calles`;

async function prepararTiles(page: Page): Promise<void> {
  await page.route("https://*.tile.openstreetmap.org/**", (route) =>
    route.abort(),
  );
}

async function acceder(page: Page): Promise<void> {
  await page.goto(urlDe("motul", "/acceso"));
  await page.getByLabel("Correo").fill(CORREO);
  await page.getByLabel("Contraseña").fill(CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(urlDe("motul"));
}

async function abrirCalle(
  page: Page,
  lugarId: string,
  nombre: string,
): Promise<void> {
  await page.goto(urlDe("motul", territorio(lugarId)));
  await page.getByRole("link", { name: new RegExp(nombre) }).click();
}

async function verificarLugarVacio(page: Page, lugarId: string): Promise<void> {
  await page.goto(urlDe("motul", territorio(lugarId)));
  await expect(page.getByText(/no tiene calles todavía/)).toBeVisible();
}

/**
 * Las acciones de la calle son renglones de acordeon dentro de
 * `PanelDeCalle`: cada etiqueta es el `summary` de su propio `<details>`. El
 * encabezado de grupo "Acciones de calle" ya no existe en el shell actual.
 */
async function abrirAccionDeCalle(page: Page, etiqueta: string): Promise<void> {
  await page
    .locator("summary", { hasText: new RegExp(`^${etiqueta}$`) })
    .click();
}

async function ubicarYReparentear(
  page: Page,
  escenario: Scenario,
): Promise<void> {
  await abrirCalle(page, escenario.origenId, escenario.movible);
  // La calle no tiene punto, asi que "Ubicar en el mapa" nace abierta.
  await expect(
    page.locator("summary", { hasText: /^Ubicar en el mapa$/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Latitud")).toBeVisible();
  await expect(page.getByLabel("Longitud")).toBeVisible();
  await page.getByRole("button", { name: "Guardar ubicación" }).click();
  await page.waitForLoadState("networkidle");
  await abrirAccionDeCalle(page, "Mover a otro lugar");
  await page.getByLabel("Nuevo lugar").selectOption({
    label: `${escenario.destino} (comisaría)`,
  });
  await page.getByRole("button", { name: "Mover calle" }).click();
  await page.waitForLoadState("networkidle");
  expect(page.url()).toContain("/territorio");
}

async function rechazarMovimientoDuplicado(
  page: Page,
  escenario: Scenario,
): Promise<void> {
  await abrirCalle(page, escenario.origenId, escenario.duplicada);
  await abrirAccionDeCalle(page, "Mover a otro lugar");
  await page.getByLabel("Nuevo lugar").selectOption({
    label: `${escenario.destino} (comisaría)`,
  });
  await page.getByRole("button", { name: "Mover calle" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Ya existe una calle" }),
  ).toBeVisible();
}

async function rechazarBajaConDomicilio(
  page: Page,
  escenario: Scenario,
): Promise<void> {
  await abrirCalle(page, escenario.origenId, escenario.domicilio);
  await abrirAccionDeCalle(page, "Dar de baja");
  await page
    .getByRole("button", {
      name: new RegExp(`Dar de baja ${escenario.domicilio}`),
    })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "tiene domicilios" }),
  ).toBeVisible();
}

async function darDeBajaReporte(
  page: Page,
  escenario: Scenario,
): Promise<void> {
  await abrirCalle(page, escenario.origenId, escenario.reporte);
  await abrirAccionDeCalle(page, "Dar de baja");
  await page
    .getByRole("button", {
      name: new RegExp(`Dar de baja ${escenario.reporte}`),
    })
    .click();
  await page.waitForLoadState("networkidle");
  // La accion exitosa vuelve al arbol **con su aviso**: el `?ok=` que emite
  // `darDeBajaCalleAction` (`irAlArbol(..., "calle-baja")`). Comprobar el
  // pathname a secas dejaria pasar una vuelta sin aviso o con el aviso de
  // otra accion.
  const volvio = new URL(page.url());
  expect(volvio.pathname).toBe("/territorio");
  expect(volvio.searchParams.get("ok")).toBe("calle-baja");
}

test("intervenciones conserva la ficha y la correccion nativa", async ({
  page,
}) => {
  await acceder(page);

  const respuestaDeIntervenciones = await page.goto(
    urlDe("motul", "/intervenciones"),
  );
  expect(respuestaDeIntervenciones?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Intervenciones", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("La bandeja de intervenciones todavía no está disponible.", {
      exact: true,
    }),
  ).toBeVisible();

  await page.goto(
    urlDe("motul", `/intervenciones/${escenario.intervencionId}`),
  );
  await expect(
    page.getByRole("heading", { name: "Intervención Obra", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Fecha de ocurrencia")).toBeVisible();

  await page
    .getByLabel("Descripción corregida")
    .fill("Descripción corregida en E2E");
  await page.getByRole("button", { name: "Guardar corrección" }).click();

  await expect(page).toHaveURL(
    urlDe("motul", `/intervenciones/${escenario.intervencionId}`),
  );
  await expect(
    page
      .getByRole("definition")
      .filter({ hasText: "Descripción corregida en E2E" }),
  ).toBeVisible();
});

test("calles conserva el flujo nativo, los estados vacios y las reglas de baja", async ({
  page,
}) => {
  await prepararTiles(page);
  await acceder(page);
  await verificarLugarVacio(page, escenario.vacioId);
  await ubicarYReparentear(page, escenario);
  await rechazarMovimientoDuplicado(page, escenario);
  await rechazarBajaConDomicilio(page, escenario);
  await darDeBajaReporte(page, escenario);

  const auditoria = await leerAuditoria(escenario);
  expect(auditoria).toEqual(
    expect.arrayContaining(["UBICAR_CALLE", "REPARENTEAR_CALLE", "BAJA_CALLE"]),
  );
});
