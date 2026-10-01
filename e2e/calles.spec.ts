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

async function ubicarYReparentear(
  page: Page,
  escenario: Scenario,
): Promise<void> {
  await abrirCalle(page, escenario.origenId, escenario.movible);
  await page.getByText("Acciones de calle").click();
  await page.getByRole("link", { name: "Ubicar en el mapa" }).click();
  await expect(page.getByLabel("Latitud")).toBeVisible();
  await expect(page.getByLabel("Longitud")).toBeVisible();
  await page.getByRole("button", { name: "Guardar ubicación" }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Mover a otro lugar" }).click();
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
  await page.getByText("Acciones de calle").click();
  await page.getByRole("link", { name: "Mover a otro lugar" }).click();
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
  await page.getByText("Acciones de calle").click();
  await page.getByRole("link", { name: "Dar de baja" }).click();
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
  await page.getByText("Acciones de calle").click();
  await page.getByRole("link", { name: "Dar de baja" }).click();
  await page
    .getByRole("button", {
      name: new RegExp(`Dar de baja ${escenario.reporte}`),
    })
    .click();
  await page.waitForLoadState("networkidle");
  expect(page.url()).toBe(urlDe("motul", "/territorio"));
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
