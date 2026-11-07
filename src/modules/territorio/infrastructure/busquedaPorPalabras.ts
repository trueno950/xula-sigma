import { type SQL, sql } from "drizzle-orm";
import { escaparComodinesDeLike } from "./escaparComodinesDeLike";
import { textoDeBusquedaSql } from "./textoDeBusquedaSql";

/**
 * Tope de palabras: cada una suma un `LIKE` por columna, y una direccion
 * escrita entera -calle, numero, colonia- no pasa de seis. Las de mas se
 * ignoran en vez de rechazar la busqueda.
 */
export const MAXIMO_DE_PALABRAS = 6;

const SIGNOS_QUE_SE_QUITAN = /[#,]/g;
/**
 * Los separadores que se escriben entre las partes de una direccion. `%` y
 * `_` no estan: una palabra de solo comodines se busca como texto literal,
 * como antes de partir la consulta (`busquedaDeDirecciones.isolation.test.ts`).
 */
const SOLO_SEPARADORES = /^[-.;:/]*$/;

/**
 * La consulta de la operadora partida en palabras: «Calle 22 #265» es
 * `["Calle", "22", "265"]`. El guion se queda porque vive dentro de numeros
 * como «265-A».
 */
export const palabrasDeBusqueda = (consulta: string): readonly string[] =>
  consulta
    .split(/\s+/)
    .map((palabra) => palabra.replace(SIGNOS_QUE_SE_QUITAN, ""))
    .filter((palabra) => !SOLO_SEPARADORES.test(palabra))
    .slice(0, MAXIMO_DE_PALABRAS);

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
