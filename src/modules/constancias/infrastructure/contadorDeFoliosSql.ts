import { sql } from "drizzle-orm";
import type { ContadorDeFolios } from "../application/puertos";
import { foliosDeDocumentos } from "./esquema";

/**
 * El contador de folios (design.md de `constancias-oficios`, seccion 4):
 * `INSERT ... ON CONFLICT (ayuntamiento_id, tipo, anio) DO UPDATE SET
 * ultimo_consecutivo = ultimo_consecutivo + 1 RETURNING ultimo_consecutivo`,
 * con el builder de Drizzle -nunca `sql\`…\`` a mano-. La referencia a la
 * derecha del `SET` es a la fila existente, no a la propuesta: Drizzle
 * emite la calificacion que Postgres exige.
 *
 * Por que no tiene carrera bajo `READ COMMITTED` (el nivel por defecto que
 * usa `withTenant`, verificado en `withTenant.ts:106`): la seccion 4 de
 * design.md. Esta funcion **no esta medida** contra Postgres real hasta que
 * corre `folio.integration.test.ts`, en la misma rebanada que la tabla.
 */
export const contadorDeFoliosSql: ContadorDeFolios = {
  async siguiente(tx, { ayuntamientoId, tipo, anio }) {
    const [fila] = await tx
      .insert(foliosDeDocumentos)
      .values({ ayuntamientoId, tipo, anio, ultimoConsecutivo: 1 })
      .onConflictDoUpdate({
        target: [
          foliosDeDocumentos.ayuntamientoId,
          foliosDeDocumentos.tipo,
          foliosDeDocumentos.anio,
        ],
        set: {
          ultimoConsecutivo: sql`${foliosDeDocumentos.ultimoConsecutivo} + 1`,
        },
      })
      .returning({ consecutivo: foliosDeDocumentos.ultimoConsecutivo });

    if (!fila) {
      throw new Error(
        "El contador de folios no devolvio fila: INSERT ... RETURNING deberia devolver siempre una.",
      );
    }

    return fila.consecutivo;
  },
};
