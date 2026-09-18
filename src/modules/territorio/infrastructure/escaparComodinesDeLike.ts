/**
 * `%` y `_` son comodines de `LIKE`/`ILIKE`, no texto literal -Postgres usa
 * `\` como caracter de escape por defecto (`standard_conforming_strings`).
 * Sin escapar, un operador que filtra por una calle cuyo nombre lleva "_"
 * ("Calle 20_A", por ejemplo) lo interpreta como comodin de un caracter en
 * vez de texto literal. No es una falla de seguridad -el parametro va ligado
 * por Drizzle, nunca concatenado a mano-, es un caso borde de interpretacion
 * del patron.
 *
 * Duplicada de `reportes/` y `constancias/`, y no importada de alli: un
 * modulo no importa de otro (`AGENTS.md`, capas).
 */
export const escaparComodinesDeLike = (texto: string): string =>
  texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
