import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { accederAMotul } from "./acceder";
import { urlDe } from "./municipios";

/**
 * S13 de `padron-ux` en el listado: la busqueda es un `<form method="get">`
 * nativo -sin Server Action ni estado de cliente-, asi que `/padron?q=` se
 * puede compartir y la pantalla filtrada la pinta el servidor.
 *
 * No se prueba con `javaScriptEnabled: false`: `(lista)/loading.tsx` abre un
 * limite de Suspense y, sin script, el HTML transmitido dentro de el nunca
 * se inserta -el mismo hallazgo S1 de `territorio-pendientes.md`-. Es deuda
 * anterior a `padron-ux`, y por eso este test mide el mecanismo y no el
 * navegador sin JavaScript.
 */
test("la busqueda es un GET nativo y el servidor pinta la pantalla filtrada", async ({
  page,
}) => {
  await accederAMotul(page);
  await page.goto(urlDe("motul", "/padron"));

  const formulario = page.locator('form[method="get"]');

  await expect(formulario).toHaveCount(1);
  await expect(formulario.locator('input[name="q"]')).toHaveCount(1);
  await expect(
    formulario.getByRole("button", { name: "Buscar" }),
  ).toBeVisible();

  // La URL filtrada, pedida en frio, ya viene recortada: no hay estado de
  // cliente que la complete despues.
  await page.goto(urlDe("motul", `/padron?q=zzz-${randomUUID()}`));

  await expect(page.getByText(/Sin resultados para/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Quitar el filtro" }),
  ).toBeVisible();
});
