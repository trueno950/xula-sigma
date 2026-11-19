import { expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import {
  liberarVentanaDeRitmo,
  prepararEscenario,
  type Scenario,
} from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * Z1, ZD1 y Z2 de `odd/tasks/territorio-ux.md` (S11 a S13): el alta de una
 * zona vive detras de un boton, el listado dice cuantas calles tiene cada
 * zona, y dentro de la zona las calles y los domicilios abren su panel en el
 * territorio en vez de quedarse como filas muertas.
 */
let escenario: Scenario;

test.beforeAll(async () => {
  escenario = await prepararEscenario({ tipoDeRaiz: "comisaria" });
});

test.beforeEach(liberarVentanaDeRitmo);

const marca = () => escenario.origenId.slice(0, 8);

test("el alta de zona vive detras de un boton y la lista empieza enseguida", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/territorio/zonas"));

  await expect(page.getByRole("button", { name: "Crear zona" })).toHaveCount(0);
  const nueva = page.getByRole("link", { name: "Nueva zona" });
  await expect(nueva).toBeVisible();

  await nueva.click();
  await expect(page).toHaveURL(/\/territorio\/zonas\?accion=nueva/);
  await expect(page.getByRole("button", { name: "Crear zona" })).toBeVisible();

  await page.getByLabel("Asentamiento").selectOption(escenario.origenId);
  await page.getByLabel("Nombre de la zona").fill(`Zona boton ${marca()}`);
  await page.getByRole("button", { name: "Crear zona" }).click();

  await expect(page).toHaveURL(/\/territorio\/zonas\?ok=zona-alta/);
  await expect(page.getByRole("button", { name: "Crear zona" })).toHaveCount(0);
});

test("la zona cuenta sus calles y cada fila de su detalle abre su panel", async ({
  page,
}) => {
  await accederAMotul(page);
  const nombre = `Zona filas ${marca()}`;

  await page.goto(urlDe("motul", "/territorio/zonas?accion=nueva"));
  await page.getByLabel("Asentamiento").selectOption(escenario.origenId);
  await page.getByLabel("Nombre de la zona").fill(nombre);
  await page.getByRole("button", { name: "Crear zona" }).click();
  await expect(page).toHaveURL(/ok=zona-alta/);

  // Z2: la columna de calles, en la misma fila que se abre.
  const fila = page.getByRole("link", {
    name: new RegExp(`^${nombre}, .*, 0 calles$`),
  });
  await expect(fila).toBeVisible();
  await fila.click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  const urlDeLaZona = page.url();

  await page
    .getByLabel("Calle del asentamiento")
    .selectOption({ label: escenario.domicilio });
  await page.getByRole("button", { name: "Agregar a la zona" }).click();
  await expect(page.getByText("Calle agregada a la zona.")).toBeVisible();

  // ZD1: la calle de la zona abre su panel en el territorio.
  await page
    .getByRole("link", { name: escenario.domicilio, exact: true })
    .click();
  await expect(page).toHaveURL(/\/territorio\?.*vista=calles.*calle=/);
  await expect(page.locator("#panel-de-calle")).toBeVisible();

  // Y el domicilio derivado abre su ficha. La pestana se confirma antes de
  // tocar una fila: la navegacion de la pestana y la busqueda de la fila
  // compiten, y sin esperar se hacia clic en la calle de la pestana anterior.
  await page.goto(urlDeLaZona);
  const tabDomicilios = page.getByRole("link", {
    name: /^Domicilios derivados/,
  });
  await tabDomicilios.click();
  await expect(tabDomicilios).toHaveAttribute("aria-current", "page");

  const filaDomicilio = page.getByRole("link", {
    name: new RegExp(`^${escenario.domicilio} sin número`),
  });
  await expect(filaDomicilio).toBeVisible();
  await filaDomicilio.click();
  await expect(page).toHaveURL(/\/territorio\?.*vista=domicilios.*domicilio=/);
  await expect(page.locator("#panel-de-domicilio")).toBeVisible();
});
