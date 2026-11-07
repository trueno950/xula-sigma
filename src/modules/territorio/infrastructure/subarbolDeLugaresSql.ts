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
import { cteDescendientes } from "./jerarquiaDeLugaresSql";

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
 * RLS acota tambien el `UNION ALL` final, que corre bajo el mismo `tx` que
 * el CTE de `jerarquiaDeLugaresSql.ts`.
 */
export const subarbolDeLugares: RepositorioDeLugares["subarbol"] = async (
  tx,
  raizId,
  opciones,
) => {
  const domicilios = opciones?.soloLugares
    ? sql.empty()
    : sql`
    UNION ALL
    SELECT 'domicilio' AS clase, dom.id, NULL, NULL,
           NULL, dom.lugar_id AS "lugarId",
           dom.calle_id AS "calleId", cal.nombre AS calle, dom.numero
      FROM domicilios dom
      JOIN descendientes d ON d.id = dom.lugar_id
      JOIN calles cal ON cal.id = dom.calle_id
     WHERE dom.baja_en IS NULL`;
  const filas = await tx.execute<FilaDeSubarbol>(sql`
    ${cteDescendientes(raizId)}
    SELECT 'lugar' AS clase, l.id, l.tipo, l.nombre,
           l.padre_id AS "padreId", NULL::uuid AS "lugarId",
           NULL::uuid AS "calleId", NULL::text AS calle, NULL::text AS numero
      FROM lugares l
      JOIN descendientes d ON d.id = l.id
     WHERE l.id <> ${raizId} AND l.baja_en IS NULL
    ${domicilios}
  `);

  return filas.map(aNodoDeSubarbol);
};
