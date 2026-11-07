import { sql } from "drizzle-orm";
import type {
  ConteoCrudoDeLugar,
  LectorDeContenidoDeLugares,
} from "../application/puertosDeContenidoDeLugares";
import { comoLugarId, type TipoDeLugar } from "../domain";
import { cteDescendientesDeCadaLugar } from "./jerarquiaDeLugaresSql";

type FilaDeContenido = {
  lugarId: string;
  tipo: TipoDeLugar;
  domicilios: number;
  calles: number;
};

/**
 * Una sola consulta para todo el arbol: baja desde cada lugar activo
 * (`jerarquiaDeLugaresSql.ts`) y agrupa los domicilios activos por
 * ancestro, con `DISTINCT` porque un ciclo de `padre_id` repite el lugar en
 * la bajada (el tope de profundidad corta el bucle, no la repeticion) e
 * inflaria la cuenta. Las calles son las propias del lugar, sin bajar. RLS
 * acota cada tabla porque corre bajo el `tx` de `withTenant`.
 */
const CONSULTA_DE_CONTENIDO = sql`
  ${cteDescendientesDeCadaLugar},
  de_domicilios AS (
    SELECT d.ancestro, count(DISTINCT dom.id)::int AS total
      FROM descendientes d
      JOIN domicilios dom ON dom.lugar_id = d.id
     WHERE dom.baja_en IS NULL
     GROUP BY d.ancestro
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
`;

export const lectorDeContenidoDeLugaresSql: LectorDeContenidoDeLugares = {
  async contarPorLugar(tx) {
    const filas = await tx.execute<FilaDeContenido>(CONSULTA_DE_CONTENIDO);

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
