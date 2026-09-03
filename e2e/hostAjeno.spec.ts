import { expect, test } from "@playwright/test";
import {
  DOMINIO_BASE,
  MUNICIPIOS,
  PUERTO,
  urlDe,
  urlDeLaRaiz,
} from "./municipios";

/**
 * Que un `x-forwarded-host` ajeno no mueva el municipio, en las dos
 * superficies que resuelven uno **sin sesion**: la pantalla de acceso de
 * un municipio y el dominio base pelado.
 *
 * Aparte de `respaldoPorHost.spec.ts` porque es otro tema y otro costo:
 * alla se prueba que el respaldo sostenga el redirect, y esos tests
 * necesitan sesion. Estos no tocan login.
 */

/**
 * En una navegacion normal el respaldo ni se alcanza: el matcher del proxy
 * cubre todo salvo assets, y el proxy borra las cabeceras `x-xula-*` que
 * vengan del cliente y escribe la suya desde `host`. `/acceso` sirve para
 * verlo porque resuelve el municipio **sin sesion** -es una de las cuatro
 * superficies que la reja de RLS sobre `sesiones` no cubre-.
 */
test("un x-forwarded-host ajeno no mueve el municipio de una pantalla publica", async ({
  page,
}) => {
  await page.route("**/acceso", async (route, request) =>
    route.continue({
      headers: {
        ...request.headers(),
        "x-forwarded-host": `${MUNICIPIOS.ticul.subdominio}.${DOMINIO_BASE}:${PUERTO}`,
      },
    }),
  );

  await page.goto(urlDe("motul", "/acceso"));

  await expect(
    page.getByRole("heading", { name: MUNICIPIOS.motul.nombre }),
  ).toBeVisible();
});

/**
 * El vector que cerro mover el respaldo al proxy.
 *
 * El dominio base pelado da superficie `raiz`, no `invalido`, asi que
 * `resolverHost` ni mira `x-forwarded-host`. Cuando la derivacion vivia en
 * `tenancy/contexto.ts` -despues de que el proxy escribiera
 * `superficie: raiz` sin subdominio- esta misma peticion devolvia 200 con
 * la pantalla de acceso de Motul. Reproducido con curl antes de sacarla.
 */
test("en la raiz, un x-forwarded-host ajeno no trae otro municipio", async ({
  page,
}) => {
  await page.route("**/acceso", async (route, request) =>
    route.continue({
      headers: {
        ...request.headers(),
        "x-forwarded-host": `${MUNICIPIOS.motul.subdominio}.${DOMINIO_BASE}:${PUERTO}`,
      },
    }),
  );

  const respuesta = await page.goto(urlDeLaRaiz("/acceso"));

  expect(respuesta?.status()).toBe(404);
  await expect(
    page.getByText(MUNICIPIOS.motul.nombre, { exact: true }),
  ).toHaveCount(0);
});
