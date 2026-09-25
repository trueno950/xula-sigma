import { expect, test } from "@playwright/test";
import { urlDeSinMunicipio } from "./municipios";

/**
 * Un subdominio que ningun municipio tiene responde 404 en cada puerta,
 * como el dominio base pelado (`hostAjeno.spec.ts`). Antes era 500:
 * `ayuntamientoActual()` lanzaba `TenantNoResueltoError` y nada la atrapaba.
 *
 * Con `request` y no con `page`: interesa el estado HTTP, no lo que pinta
 * la pagina de error de Next.
 */

const RUTAS_DE_LECTURA = [
  "/acceso",
  "/",
  "/padron",
  "/reportes/RP-2026-000001",
  "/validar/VEC-2026-000001",
  "/eventos",
  "/constancias/11111111-1111-4111-8111-111111111111/pdf",
];

for (const ruta of RUTAS_DE_LECTURA) {
  test(`GET ${ruta} en un subdominio sin municipio es 404`, async ({
    request,
  }) => {
    const respuesta = await request.get(urlDeSinMunicipio(ruta), {
      maxRedirects: 0,
    });

    expect(respuesta.status()).toBe(404);
  });
}

test("el acceso por API en un subdominio sin municipio es 404", async ({
  request,
}) => {
  const respuesta = await request.post(
    urlDeSinMunicipio("/api/auth/sign-in/email"),
    { data: { email: "a@example.com", password: "x".repeat(12) } },
  );

  expect(respuesta.status()).toBe(404);
});
