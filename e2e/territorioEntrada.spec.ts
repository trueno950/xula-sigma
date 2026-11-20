import { expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { liberarVentanaDeRitmo, prepararEscenario } from "./calles.fixture";
import { urlDe } from "./municipios";

/**
 * I1 de `odd/tasks/territorio-ux.md` (S1): la busqueda de la entrada solo se
 * enviaba con Enter, y en el celular nadie lo sabe. El boton es real -un GET
 * nativo-, y el filtro aplicado queda a la vista con su chip.
 */
test.beforeAll(async () => {
  await prepararEscenario({ tipoDeRaiz: "comisaria" });
});

test.beforeEach(liberarVentanaDeRitmo);

test("la busqueda de lugares se envia con el boton, sin JavaScript de por medio", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/territorio"));

  // Es el unico buscador de la entrada: el de domicilio ya no se apila abajo.
  await expect(page.getByRole("searchbox")).toHaveCount(1);
  const campo = page.getByLabel("Buscar lugar o domicilio");
  const formulario = page.locator("form", { has: campo });
  await expect(
    formulario.getByRole("button", { name: "Buscar" }),
  ).toBeVisible();

  await campo.fill("zzz-no-existe");
  await formulario.getByRole("button", { name: "Buscar" }).click();

  await expect(page).toHaveURL(/\?q=zzz-no-existe$/);
  await expect(
    page.getByRole("link", { name: /Quitar filtro: Búsqueda: zzz-no-existe/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: /Quitar filtro/ }).click();
  await expect(page).toHaveURL(/\/territorio$/);
});

test("la misma busqueda se lleva al registro de domicilios con un enlace", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/territorio?q=Calle 22 265"));

  await page
    .getByRole("link", {
      name: "Buscar «Calle 22 265» en el registro de domicilios",
    })
    .click();

  await expect(page).toHaveURL(/\/territorio\/domicilios\?q=Calle%2022%20265$/);
  await expect(page.getByLabel("Calle y número", { exact: true })).toHaveValue(
    "Calle 22 265",
  );
});
