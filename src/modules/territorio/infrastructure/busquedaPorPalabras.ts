import { type SQL, sql } from "drizzle-orm";
import { palabrasDeBusqueda } from "../domain/busquedaPorPalabras";
import { escaparComodinesDeLike } from "./escaparComodinesDeLike";
import { textoDeBusquedaSql } from "./textoDeBusquedaSql";

const patronDe = (palabra: string): SQL =>
  textoDeBusquedaSql(sql`${`%${escaparComodinesDeLike(palabra)}%`}::text`);

/**
 * Cada palabra tiene que aparecer en alguna de las columnas. La palabra va
 * siempre como parametro ligado; sin palabras la condicion es `FALSE`, para
 * que una consulta de solo signos no devuelva el municipio entero.
 */
export const condicionDeBusquedaPorPalabras = (
  consulta: string,
  columnas: readonly SQL[],
): SQL => {
  const palabras = palabrasDeBusqueda(consulta);

  if (palabras.length === 0) return sql`FALSE`;

  const porPalabra = palabras.map((palabra) => {
    const patron = patronDe(palabra);
    const alguna = columnas.map(
      (columna) => sql`${textoDeBusquedaSql(columna)} LIKE ${patron}`,
    );
    return sql`(${sql.join(alguna, sql` OR `)})`;
  });

  return sql`(${sql.join(porPalabra, sql` AND `)})`;
};
