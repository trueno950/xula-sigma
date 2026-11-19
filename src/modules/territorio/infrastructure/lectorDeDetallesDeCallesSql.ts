import { sql } from "drizzle-orm";
import type {
  DetalleDeCalle,
  LectorDeDetallesDeCalles,
} from "../application/puertosDeDetallesDeCalles";
import { comoCalleId } from "../domain";

type FilaDeDetalle = {
  calleId: string;
  zona: string | null;
  domicilios: number;
};

/**
 * El catalogo del asentamiento con su zona y su cuenta, en una sola
 * consulta: las dos subconsultas correlacionadas se pagan una vez por fila
 * y no una lectura por calle.
 *
 * La zona es la primera activa por nombre porque la pertenencia es M:N
 * (`calles_de_zonas`, rebanada B1) y la tabla de la pestana tiene una sola
 * columna para ella: con dos zonas activas el orden alfabetico elige siempre
 * la misma, que es la diferencia entre un dato estable y uno que cambia de
 * humor. Una zona dada de baja no nombra la calle.
 *
 * RLS acota `calles`, `calles_de_zonas`, `zonas` y `domicilios` porque todo
 * corre bajo el `tx` de `withTenant`.
 */
const CONSULTA_DE_DETALLES = (lugarId: string) => sql`
  SELECT c.id AS "calleId",
         (SELECT z.nombre
            FROM calles_de_zonas cz
            JOIN zonas z ON z.id = cz.zona_id
           WHERE cz.calle_id = c.id AND z.baja_en IS NULL
           ORDER BY z.nombre
           LIMIT 1) AS zona,
         (SELECT count(*)::int
            FROM domicilios d
           WHERE d.calle_id = c.id AND d.baja_en IS NULL) AS domicilios
    FROM calles c
   WHERE c.lugar_id = ${lugarId} AND c.baja_en IS NULL
   ORDER BY c.nombre
`;

export const lectorDeDetallesDeCallesSql: LectorDeDetallesDeCalles = {
  async detallesPorLugar(tx, lugarId) {
    const filas = await tx.execute<FilaDeDetalle>(
      CONSULTA_DE_DETALLES(lugarId),
    );

    return filas.map(
      (fila): DetalleDeCalle => ({
        calleId: comoCalleId(fila.calleId),
        zona: fila.zona,
        domicilios: fila.domicilios,
      }),
    );
  },
};
