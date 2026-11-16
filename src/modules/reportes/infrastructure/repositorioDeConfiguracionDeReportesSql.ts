import { eq } from "drizzle-orm";
import type { RepositorioDeConfiguracionDeReportes } from "../application/puertosDeConfiguracion";
import { configuracionDeReportes } from "./esquema";

/**
 * Implementacion real de `RepositorioDeConfiguracionDeReportes` contra
 * `configuracion_de_reportes`. Mismo motivo que
 * `repositorioDeDocumentosSql`: no hay credenciales que fakear, y el mismo
 * Postgres que da RLS es el que aisla la escritura -cubierto por
 * `umbralDeAtraso.isolation.test.ts` y por el test de integracion-. El
 * `ayuntamientoId` llega del contexto del servidor y es tambien el
 * `ayuntamiento_id` de la fila: la politica de tenant rechaza cualquier otro.
 */
export const repositorioDeConfiguracionDeReportesSql: RepositorioDeConfiguracionDeReportes =
  {
    async leer(tx, ayuntamientoId) {
      const [fila] = await tx
        .select({ diasDeAtraso: configuracionDeReportes.diasDeAtraso })
        .from(configuracionDeReportes)
        .where(eq(configuracionDeReportes.ayuntamientoId, ayuntamientoId));

      return fila?.diasDeAtraso ?? null;
    },

    async escribir(tx, ayuntamientoId, diasDeAtraso) {
      await tx
        .insert(configuracionDeReportes)
        .values({ ayuntamientoId, diasDeAtraso })
        .onConflictDoUpdate({
          target: configuracionDeReportes.ayuntamientoId,
          set: { diasDeAtraso },
        });
    },
  };
