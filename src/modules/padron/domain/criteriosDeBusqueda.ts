/**
 * Cuatro letras, un digito y hasta trece alfanumericos: el menor prefijo de
 * una CURP que ya lleva un digito. Sin el digito, "Poot" o "Guadalupe"
 * -que son nombres- se propondrian tambien como CURP; con el, un
 * fragmento como "POCM8" ya es inequivoco y "POCM" a secas sigue siendo
 * solo un nombre. Las clases `[A-Z0-9]` dejan fuera `%` y `_` por
 * construccion.
 */
const FRAGMENTO_DE_CURP = /^[A-Z]{4}\d[A-Z0-9]{0,13}$/;

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
  const palabras = cadenaExpandida.split(/\s+/).filter(Boolean);
  const compacta = cadena.replace(/\s+/g, "").toUpperCase();

  return FRAGMENTO_DE_CURP.test(compacta)
    ? { palabras, curp: compacta }
    : { palabras };
}
