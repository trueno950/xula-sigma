import { sql } from "drizzle-orm";
import type { LectorDeDirecciones } from "../application/puertosDeDirecciones";
import { cteAscendientes } from "./jerarquiaDeLugaresSql";

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
 * `calles` y `lugares`. Una sola consulta que sube por `padreId` desde el
 * lugar del domicilio (`jerarquiaDeLugaresSql.ts`, design.md seccion 7).
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
      ${cteAscendientes(
        sql`(SELECT lugar_id FROM domicilios WHERE id = ${domicilioId})`,
      )}
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
