/**
 * Tope de palabras: cada una suma un `LIKE` por columna, y una direccion
 * escrita entera -calle, numero, colonia- no pasa de seis. Las de mas se
 * ignoran en vez de rechazar la busqueda, y `avisoDePalabrasIgnoradas` es lo
 * que se le dice a la operadora cuando eso pasa.
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
const palabrasDeLaConsulta = (consulta: string): readonly string[] =>
  consulta
    .split(/\s+/)
    .map((palabra) => palabra.replace(SIGNOS_QUE_SE_QUITAN, ""))
    .filter((palabra) => !SOLO_SEPARADORES.test(palabra));

/** Las que entran al `WHERE`: las primeras, hasta el tope. */
export const palabrasDeBusqueda = (consulta: string): readonly string[] =>
  palabrasDeLaConsulta(consulta).slice(0, MAXIMO_DE_PALABRAS);

/** Las que el tope dejo fuera, para poder decircelo a la operadora. */
export const palabrasIgnoradasDeBusqueda = (consulta: string): number =>
  Math.max(0, palabrasDeLaConsulta(consulta).length - MAXIMO_DE_PALABRAS);

/**
 * El aviso que acompaña al filtro de busqueda. Con una sola palabra fuera es
 * singular, y sin palabras ignoradas no hay nada que avisar. El mismo texto
 * en los dos buscadores: el del padron arma la frase con su propio tope.
 */
export const avisoDePalabrasIgnoradas = (
  consulta: string,
): string | undefined => {
  const ignoradas = palabrasIgnoradasDeBusqueda(consulta);

  if (ignoradas === 0) return undefined;

  const recorte =
    ignoradas === 1
      ? "se ignoró 1 palabra"
      : `se ignoraron ${ignoradas} palabras`;

  return `Se busca con las ${MAXIMO_DE_PALABRAS} primeras palabras; ${recorte}.`;
};
