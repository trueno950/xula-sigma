import { sql } from "drizzle-orm";
import type {
  ConteoCrudoDeLugar,
  LectorDeContenidoDeLugares,
} from "../application/puertosDeContenidoDeLugares";
import { comoLugarId, type TipoDeLugar } from "../domain";

type FilaDeContenido = {
  lugarId: string;
  tipo: TipoDeLugar;
  domicilios: number;
  calles: number;
};

/**
 * Una sola consulta para todo el arbol. El `WITH RECURSIVE` baja desde cada
 * lugar activo por `padre_id` -mismo cinturon `profundidad < 8` y
 * `baja_en IS NULL` que `subarbol`, asi que un lugar dado de baja corta su
 * rama y sus domicilios no suman-; despues se agrupan los domicilios activos
 * por ancestro. Las calles son las propias del lugar, sin bajar. Todo es
 * identificador fijo: no hay parametro ni texto de usuario. RLS acota cada
 * tabla porque corre bajo el `tx` de `withTenant`.
 */
export const lectorDeContenidoDeLugaresSql: LectorDeContenidoDeLugares = {
  async contarPorLugar(tx) {
    const filas = await tx.execute<FilaDeContenido>(sql`
      WITH RECURSIVE bajada AS (
        SELECT id AS ancestro, id AS lugar, 0 AS profundidad
          FROM lugares
         WHERE baja_en IS NULL
        UNION ALL
        SELECT b.ancestro, l.id, b.profundidad + 1
          FROM lugares l
          JOIN bajada b ON l.padre_id = b.lugar
         WHERE b.profundidad < 8 AND l.baja_en IS NULL
      ),
      de_domicilios AS (
        SELECT b.ancestro, count(*)::int AS total
          FROM bajada b
          JOIN domicilios dom ON dom.lugar_id = b.lugar
         WHERE dom.baja_en IS NULL
         GROUP BY b.ancestro
      ),
      de_calles AS (
        SELECT lugar_id, count(*)::int AS total
          FROM calles
         WHERE baja_en IS NULL
         GROUP BY lugar_id
      )
      SELECT l.id AS "lugarId", l.tipo,
             COALESCE(dd.total, 0) AS domicilios,
             COALESCE(dc.total, 0) AS calles
        FROM lugares l
        LEFT JOIN de_domicilios dd ON dd.ancestro = l.id
        LEFT JOIN de_calles dc ON dc.lugar_id = l.id
       WHERE l.baja_en IS NULL
    `);

    return filas.map(
      (fila): ConteoCrudoDeLugar => ({
        lugarId: comoLugarId(fila.lugarId),
        tipo: fila.tipo,
        domicilios: fila.domicilios,
        calles: fila.calles,
      }),
    );
  },
};
