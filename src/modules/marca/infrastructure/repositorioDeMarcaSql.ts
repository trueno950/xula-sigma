import { eq } from "drizzle-orm";
import { ayuntamientos } from "@/shared/tenancy/esquema";
import type { RepositorioDeMarca } from "../application/puertos";

/**
 * Implementacion real de `RepositorioDeMarca` contra `ayuntamientos.marca`.
 *
 * A diferencia de `almacenR2`, no hay credenciales externas que fakear en
 * tests: el mismo Postgres que da RLS es el que aisla `escribir`, asi que
 * esta implementacion corre igual en produccion y en los tests de
 * integracion del modulo — cubierta por
 * `cambiarEscudo.integration.test.ts` y `escudo.isolation.test.ts`, no por
 * un archivo `*.test.ts` propio.
 */
export const repositorioDeMarcaSql: RepositorioDeMarca = {
  async leer(tx, ayuntamientoId) {
    const [fila] = await tx
      .select({ marca: ayuntamientos.marca })
      .from(ayuntamientos)
      .where(eq(ayuntamientos.id, ayuntamientoId));

    return fila ? fila.marca : null;
  },

  async escribir(tx, ayuntamientoId, marca) {
    await tx
      .update(ayuntamientos)
      .set({ marca })
      .where(eq(ayuntamientos.id, ayuntamientoId));
  },
};
