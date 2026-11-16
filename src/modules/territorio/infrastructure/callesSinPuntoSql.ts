import { sql } from "drizzle-orm";
import type { LectorDeCallesSinPunto } from "../application/puertosDeLecturaDeCalles";
import { comoCalleId, comoLugarId } from "../domain";
import { cteDescendientesDeCadaLugar } from "./jerarquiaDeLugaresSql";

type FilaDeCalleSinPunto = {
  calleId: string;
  calleNombre: string;
  lugarId: string;
  raizId: string;
  raizNombre: string;
};

/**
 * Un solo recorrido para todo el municipio: el CTE de
 * `jerarquiaDeLugaresSql.ts` da cada lugar activo con su raiz, y cada calle
 * sin punto se cuelga de su lugar. Sin eso habria una consulta por raiz.
 *
 * `latitud IS NULL` y no `latitud IS NULL OR longitud IS NULL`: el CHECK de
 * `calles` exige que las dos columnas viajen juntas
 * (`esquemaDeCalles.ts`), asi que una sola alcanza y la otra seria codigo
 * muerto. RLS acota `calles`, `lugares` y el CTE bajo el mismo `tx`.
 *
 * Una calle activa colgada de un lugar ya dado de baja no aparece: el CTE
 * solo baja por lugares activos, mismo criterio que `listarCallesDelMunicipio`.
 */
const CONSULTA_DE_CALLES_SIN_PUNTO = sql`
  ${cteDescendientesDeCadaLugar}
  SELECT c.id AS "calleId", c.nombre AS "calleNombre", c.lugar_id AS "lugarId",
         r.id AS "raizId", r.nombre AS "raizNombre"
    FROM calles c
    JOIN descendientes d ON d.id = c.lugar_id
    JOIN lugares r ON r.id = d.ancestro AND r.padre_id IS NULL
   WHERE c.baja_en IS NULL AND c.latitud IS NULL
   ORDER BY r.nombre, c.nombre
`;

export const lectorDeCallesSinPuntoSql: LectorDeCallesSinPunto = {
  async listarSinPunto(tx) {
    const filas = await tx.execute<FilaDeCalleSinPunto>(
      CONSULTA_DE_CALLES_SIN_PUNTO,
    );

    return filas.map((fila) => ({
      calleId: comoCalleId(fila.calleId),
      calleNombre: fila.calleNombre,
      lugarId: comoLugarId(fila.lugarId),
      raizId: comoLugarId(fila.raizId),
      raizNombre: fila.raizNombre,
    }));
  },
};
