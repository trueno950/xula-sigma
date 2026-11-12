/**
 * Cuatro letras, un digito y hasta trece alfanumericos: el menor prefijo de
 * una CURP que ya lleva un digito. Sin el digito, "Poot" o "Guadalupe"
 * -que son nombres- se propondrian tambien como CURP; con el, un
 * fragmento como "POCM8" ya es inequivoco y "POCM" a secas sigue siendo
 * solo un nombre. Las clases `[A-Z0-9]` dejan fuera `%` y `_` por
 * construccion.
 */
const FRAGMENTO_DE_CURP = /^[A-Z]{4}\d[A-Z0-9]{0,13}$/;

/**
 * Tope de palabras que entran al `WHERE`. Cada palabra se vuelve dos
 * expresiones SQL -prefijo de la cadena y palabra interior-, y `/padron`
 * acepta `q` sin largo maximo: sin tope, una cadena de cientos de palabras
 * arma una consulta de cientos de condiciones contra la base. Ocho ya
 * cubre "nombres y apellidos" de una persona real; lo que sobra se
 * descarta por la cola, que es donde una cadena pegaso agrega ruido.
 */
const MAXIMO_DE_PALABRAS = 8;

/**
 * La misma particion que la busqueda: `normalizarParaBusqueda` quita los
 * puntos y descarta los tokens vacios antes de partir en palabras, asi que
 * «Poot.» y «.» son una palabra y ninguna, no dos. Sin eso el aviso contaba
 * un punto suelto que la busqueda nunca miro (S3 de
 * `territorio-seguimiento`).
 */
const palabrasDeLaCadena = (cadena: string): readonly string[] =>
  cadena.replace(/[.]/g, "").split(/\s+/).filter(Boolean);

/**
 * Las palabras que el tope deja fuera del `WHERE`, para decircelo a la
 * operadora. La busqueda corre sobre la cadena expandida y normalizada, y
 * esta cuenta sobre la escrita con la misma particion: coinciden mientras
 * cada abreviatura del catalogo sea una sola palabra, que es como esta
 * sembrado (`drizzle/0004_padron.sql`).
 */
export const palabrasIgnoradasDeBusqueda = (cadena: string): number =>
  Math.max(0, palabrasDeLaCadena(cadena).length - MAXIMO_DE_PALABRAS);

/**
 * El aviso que acompaña al buscador. Con una sola palabra fuera es singular,
 * y sin palabras ignoradas no hay nada que avisar. El texto es el mismo que
 * el de la busqueda de domicilios, con el tope de este buscador.
 */
export const avisoDePalabrasIgnoradas = (
  cadena: string,
): string | undefined => {
  const ignoradas = palabrasIgnoradasDeBusqueda(cadena);

  if (ignoradas === 0) return undefined;

  const recorte =
    ignoradas === 1
      ? "se ignoró 1 palabra"
      : `se ignoraron ${ignoradas} palabras`;

  return `Se busca con las ${MAXIMO_DE_PALABRAS} primeras palabras; ${recorte}.`;
};

export type CriteriosDeBusqueda = {
  readonly palabras: readonly string[];
  readonly curp?: string;
};

/**
 * Lo que la busqueda del padron suma a la similitud de trigramas: prefijo
 * de palabra sobre el nombre normalizado y prefijo de CURP. La similitud
 * sola no encuentra "Poot" dentro de "maria guadalupe poot canul" -una
 * palabra suelta comparte pocos trigramas con la cadena entera-, y nunca
 * consulta la CURP.
 *
 * `cadenaExpandida` ya paso por `normalizarParaBusqueda`; la CURP sale de
 * `cadena` porque la expansion de abreviaturas no debe tocarla.
 */
export function criteriosDeBusqueda(
  cadena: string,
  cadenaExpandida: string,
): CriteriosDeBusqueda {
  const palabras = palabrasDeLaCadena(cadenaExpandida).slice(
    0,
    MAXIMO_DE_PALABRAS,
  );
  const compacta = cadena.replace(/\s+/g, "").toUpperCase();

  return FRAGMENTO_DE_CURP.test(compacta)
    ? { palabras, curp: compacta }
    : { palabras };
}
