import { sql } from "drizzle-orm";
import type { LectorDeDirecciones } from "../application/puertosDeDirecciones";

type FilaDeDireccion = {
  calle: string;
  numero: string | null;
  entreCalleA: string | null;
  entreCalleB: string | null;
  referencia: string | null;
  nombreAncestro: string;
};

/**
 * Implementacion real de `LectorDeDirecciones` contra `domicilios`,
 * `calles` y `lugares`. Un solo `WITH RECURSIVE` hacia arriba por
 * `padreId`, mismo patron que `repositorioDeLugaresSql.subarbol` -Drizzle
 * 0.45.2 no expresa un CTE auto-referente-, con el mismo cinturon
 * `profundidad < 8` (design.md seccion 7).
 *
 * Una fila por nivel de ancestro, ordenada del mas profundo al mas
 * superficial (`profundidad ASC`, donde 0 es el propio `lugarId` del
 * domicilio); `calle`, `numero`, `entreCalleA`, `entreCalleB` y
 * `referencia` viajan repetidos en cada fila porque son del domicilio, no
 * del ancestro -alcanza con leerlos de la primera-.
 *
 * Nombra `domicilios`, `calles` y `lugares`: ninguno dispara
 * `identidadPorPuerto.test.ts` (design.md seccion 7, la trampa de la
 * decision 6 aplicada aca).
 */
export const lectorDeDireccionesSql: LectorDeDirecciones = {
  async partesDe(tx, domicilioId) {
    const filas = await tx.execute<FilaDeDireccion>(sql`
      WITH RECURSIVE ascendientes AS (
        SELECT l.id, l.nombre, l.padre_id, 0 AS profundidad
          FROM domicilios dom
          JOIN lugares l ON l.id = dom.lugar_id
         WHERE dom.id = ${domicilioId} AND l.baja_en IS NULL
        UNION ALL
        SELECT l.id, l.nombre, l.padre_id, a.profundidad + 1
          FROM lugares l
          JOIN ascendientes a ON l.id = a.padre_id
         WHERE a.profundidad < 8 AND l.baja_en IS NULL
      )
      SELECT
        calle.nombre AS calle,
        dom.numero,
        entre_a.nombre AS "entreCalleA",
        entre_b.nombre AS "entreCalleB",
        dom.referencia,
        a.nombre AS "nombreAncestro"
        FROM ascendientes a
        JOIN domicilios dom ON dom.id = ${domicilioId}
        JOIN calles calle ON calle.id = dom.calle_id
        LEFT JOIN calles entre_a ON entre_a.id = dom.entre_calle_a_id
        LEFT JOIN calles entre_b ON entre_b.id = dom.entre_calle_b_id
       ORDER BY a.profundidad ASC
    `);

    if (filas.length === 0) return null;

    const primera = filas[0]!;

    return {
      calle: primera.calle,
      numero: primera.numero,
      entreCalleA: primera.entreCalleA,
      entreCalleB: primera.entreCalleB,
      referencia: primera.referencia,
      ancestros: filas.map((fila) => fila.nombreAncestro),
    };
  },
};
