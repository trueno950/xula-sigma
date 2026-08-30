import { eq } from "drizzle-orm";
import type { RepositorioDeDocumentos } from "../application/puertosDeLectura";
import { configuracionDeDocumentos } from "./esquema";

/**
 * Implementacion real de `RepositorioDeDocumentos` contra
 * `configuracion_de_documentos`.
 *
 * `escribir` compone un `INSERT ... ON CONFLICT (ayuntamiento_id) DO
 * UPDATE`, nunca un `UPDATE` a secas: la tabla no tiene `GRANT` de
 * `DELETE`, asi que un ayuntamiento sin fila es "sin configurar" y la
 * primera escritura tiene que crear la fila, no asumir que ya existe
 * (design.md de `constancias-oficios`, decision 8).
 *
 * Igual que `repositorioDeMarcaSql`, no hay credenciales externas que
 * fakear en tests: el mismo Postgres que da RLS es el que aisla `escribir`,
 * cubierto por `documentos.isolation.test.ts` y el test de integracion de
 * la Fase 3, no por este archivo (que solo prueba la forma de la consulta
 * con un `tx` fabricado a mano).
 */
export const repositorioDeDocumentosSql: RepositorioDeDocumentos = {
  async leer(tx, ayuntamientoId) {
    const [fila] = await tx
      .select({ datos: configuracionDeDocumentos.datos })
      .from(configuracionDeDocumentos)
      .where(eq(configuracionDeDocumentos.ayuntamientoId, ayuntamientoId));

    return fila ? fila.datos : null;
  },

  async escribir(tx, ayuntamientoId, datos) {
    await tx
      .insert(configuracionDeDocumentos)
      .values({ ayuntamientoId, datos })
      .onConflictDoUpdate({
        target: configuracionDeDocumentos.ayuntamientoId,
        set: { datos },
      });
  },
};
