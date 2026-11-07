import { and, eq, isNull, sql } from "drizzle-orm";
import type { LectorDeUbicaciones } from "../application/puertosDeDirecciones";
import { calles } from "./esquema";
import { cteAscendientes } from "./jerarquiaDeLugaresSql";

type FilaDeAncestro = {
  nombreAncestro: string;
};

/**
 * Implementacion real de `LectorDeUbicaciones` contra `lugares` y `calles`.
 * Dos consultas dentro del mismo `tx`, nunca un `LEFT JOIN` (design.md
 * seccion 9): con `LEFT JOIN`, "no se pidio calle" y "la calle no existe"
 * producen el mismo `NULL`, y es exactamente la diferencia que decide
 * `UbicacionInvalidaError` en `reportes` (Fase 4).
 *
 * 1. Hacia arriba por `padre_id` desde `lugarId`
 *    (`jerarquiaDeLugaresSql.ts`). Cero filas -> `null`.
 * 2. Solo si `calleId !== null`: `SELECT nombre FROM calles WHERE id = $1`
 *    con el builder de Drizzle, activa (`baja_en IS NULL`). Cero filas ->
 *    `null` entero -mismo invariante que el punto 1, no un `calle: null`
 *    parcial-: una `calleId` provista que no resuelve colapsa con los otros
 *    tres casos invalidos (design.md seccion 9).
 */
export const lectorDeUbicacionesSql: LectorDeUbicaciones = {
  async partesDe(tx, lugarId, calleId) {
    const filasDeLugares = await tx.execute<FilaDeAncestro>(sql`
      ${cteAscendientes(sql`${lugarId}`)}
      SELECT nombre AS "nombreAncestro"
        FROM ascendientes
       ORDER BY profundidad ASC
    `);

    if (filasDeLugares.length === 0) return null;

    if (calleId === null) {
      return {
        calle: null,
        ancestros: filasDeLugares.map((fila) => fila.nombreAncestro),
      };
    }

    const [filaDeCalle] = await tx
      .select({ nombre: calles.nombre })
      .from(calles)
      .where(and(eq(calles.id, calleId), isNull(calles.bajaEn)));

    if (!filaDeCalle) return null;

    return {
      calle: filaDeCalle.nombre,
      ancestros: filasDeLugares.map((fila) => fila.nombreAncestro),
    };
  },
};
