/**
 * `%` y `_` son comodines de `LIKE`/`ILIKE`, no texto literal -Postgres usa
 * `\` como caracter de escape por defecto (`standard_conforming_strings`).
 * Sin escapar, un operador que busca un reporte cuya descripcion tiene un
 * "%" literal (un porcentaje de avance, por ejemplo) termina trayendo la
 * tabla entera, y uno que busca "_" matchea cualquier caracter en esa
 * posicion (GGA, PR de listados). No es una falla de seguridad -el
 * parametro va ligado por Drizzle, nunca concatenado a mano-, es un caso
 * borde de interpretacion del patron.
 */
export const escaparComodinesDeLike = (texto: string): string =>
  texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
