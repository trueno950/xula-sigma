import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it } from "vitest";
import { limpiar, owner, sembrar } from "./municipiosDePrueba";
import {
  cerrarConexion,
  resolverAyuntamientoPorSubdominio,
} from "./withTenant";

/**
 * La fila reservada de plataforma **no es un municipio**.
 *
 * Existe porque la identidad del `SUPER_ADMIN` reusa las cuatro tablas de
 * autenticacion en vez de tener un segundo mecanismo de sesion propio
 * (diseno seccion 10). La contrapartida de esa decision es esta: si
 * `resolverAyuntamientoPorSubdominio` la devolviera, la plataforma
 * aparecerian como un ayuntamiento mas —con su subdominio resolviendo, su
 * pantalla de acceso y su escudo— y cualquiera podria tocar la puerta.
 *
 * Archivo propio y no un caso mas en `resolverAyuntamiento.isolation`:
 * aquel prueba que sin tenant fijado no se ve nada de las otras tablas;
 * este prueba una exclusion de negocio sobre la unica tabla que si es
 * publica. Son dos afirmaciones distintas.
 */

const idPlataforma = randomUUID();
const SUBDOMINIO_PLATAFORMA = "plataforma";

beforeAll(async () => {
  await sembrar();

  // Con el rol owner: `xula_super_admin` no puede crearla —su politica
  // tiene `WITH CHECK (NOT es_plataforma)`— y esa es justamente la
  // garantia que prueba `provision.isolation.test.ts`. Aca se siembra como
  // se sembraria en produccion: a mano, una vez por entorno.
  await owner`
    INSERT INTO ayuntamientos (id, subdominio, nombre, es_plataforma)
    VALUES (${idPlataforma}, ${SUBDOMINIO_PLATAFORMA}, 'XULA SIGMA', true)
  `;
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

it("el subdominio de plataforma no resuelve como ayuntamiento", async () => {
  expect(await resolverAyuntamientoPorSubdominio(SUBDOMINIO_PLATAFORMA)).toBe(
    null,
  );
});

it("los municipios de verdad siguen resolviendo", async () => {
  /**
   * Control positivo. Sin esto, un `resolverAyuntamientoPorSubdominio` roto
   * —o un `WHERE` que no devuelva nada nunca— dejaria verde el test de
   * arriba sin probar la exclusion.
   */
  const { subdominioMotul } = await import("./municipiosDePrueba");
  const municipio = await resolverAyuntamientoPorSubdominio(subdominioMotul);

  expect(municipio?.nombre).toBe("Motul");
});

it("solo puede existir una fila de plataforma", async () => {
  /**
   * Lo sostiene el indice parcial `ayuntamientos_una_plataforma`, no el
   * codigo. Un seed corrido dos veces por error dejaria dos plataformas, y
   * la segunda no tendria como notarse: ninguna resuelve en el directorio.
   */
  const segunda = owner`
    INSERT INTO ayuntamientos (id, subdominio, nombre, es_plataforma)
    VALUES (${randomUUID()}, 'plataforma-2', 'Otra', true)
  `;

  await expect(segunda).rejects.toThrow(/ayuntamientos_una_plataforma/i);
});
