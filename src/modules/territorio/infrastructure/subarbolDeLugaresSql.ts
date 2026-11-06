import { sql } from "drizzle-orm";
import type {
  NodoDeSubarbol,
  RepositorioDeLugares,
} from "../application/puertos";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  type TipoDeLugar,
} from "../domain";

type FilaDeSubarbol = {
  clase: "lugar" | "domicilio";
  id: string;
  tipo: TipoDeLugar | null;
  nombre: string | null;
  padreId: string | null;
  lugarId: string | null;
  calleId: string | null;
  calle: string | null;
  numero: string | null;
};

const aNodoDeSubarbol = (fila: FilaDeSubarbol): NodoDeSubarbol =>
  fila.clase === "lugar"
    ? {
        clase: "lugar",
        id: comoLugarId(fila.id),
        tipo: fila.tipo as TipoDeLugar,
        nombre: fila.nombre as string,
        padreId: fila.padreId ? comoLugarId(fila.padreId) : null,
      }
    : {
        clase: "domicilio",
        id: comoDomicilioId(fila.id),
        lugarId: comoLugarId(fila.lugarId as string),
        calleId: comoCalleId(fila.calleId as string),
        calle: fila.calle as string,
        numero: fila.numero,
      };

/**
 * `WITH RECURSIVE` en `sql` crudo y no con el builder de Drizzle: la
 * version instalada (0.45.2, verificado — no exporta `withRecursive` ni
 * nada equivalente) no tiene forma de expresar un CTE que se referencia
 * a si mismo. Es la unica consulta de `repositorioDeLugaresSql` que lo
 * necesita; el resto usa el builder. Solo `raizId` es parametro; el resto
 * es identificador fijo, sin texto de usuario que concatenar (design.md
 * seccion 12, "SUBARBOL"). RLS acota las dos ramas y el `UNION ALL` final, porque
 * las tres corren bajo el mismo `tx` con `app.tenant` ya fijado.
 */
export const subarbolDeLugares: RepositorioDeLugares["subarbol"] = async (
  tx,
  raizId,
) => {
  const filas = await tx.execute<FilaDeSubarbol>(sql`
    WITH RECURSIVE descendientes AS (
      SELECT id, 0 AS profundidad FROM lugares
       WHERE id = ${raizId} AND baja_en IS NULL
      UNION ALL
      SELECT l.id, d.profundidad + 1
        FROM lugares l
        JOIN descendientes d ON l.padre_id = d.id
       WHERE d.profundidad < 8 AND l.baja_en IS NULL
    )
    SELECT 'lugar' AS clase, l.id, l.tipo, l.nombre,
           l.padre_id AS "padreId", NULL::uuid AS "lugarId",
           NULL::uuid AS "calleId", NULL::text AS calle, NULL::text AS numero
      FROM lugares l
      JOIN descendientes d ON d.id = l.id
     WHERE l.id <> ${raizId} AND l.baja_en IS NULL
    UNION ALL
    SELECT 'domicilio' AS clase, dom.id, NULL, NULL,
           NULL, dom.lugar_id AS "lugarId",
           dom.calle_id AS "calleId", cal.nombre AS calle, dom.numero
      FROM domicilios dom
      JOIN descendientes d ON d.id = dom.lugar_id
      JOIN calles cal ON cal.id = dom.calle_id
     WHERE dom.baja_en IS NULL
  `);

  return filas.map(aNodoDeSubarbol);
};
