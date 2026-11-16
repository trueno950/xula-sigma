import { contraste } from "./contraste";

/**
 * El color del texto sobre el primario, decidido por el servidor (S2).
 *
 * No es un campo del formulario: quien elige el color de fondo no esta en
 * condiciones de juzgar si su texto se lee, y el par es justamente lo que
 * mide la reja de `validarMarca`. Se comparan las dos razones y gana la
 * mayor, en vez de decidir por la luminancia del fondo contra un umbral: el
 * umbral es una aproximacion que falla en los tonos medios, y la
 * comparacion de las dos razones es exacta.
 */

export const TEXTO_CLARO = "#ffffff";
export const TEXTO_OSCURO = "#000000";

/** `null` cuando el fondo no se puede medir: quien pregunta decide que hacer. */
export const textoSobre = (fondo: string): string | null => {
  const razonClaro = contraste(fondo, TEXTO_CLARO);

  if (razonClaro === null) return null;

  const razonOscuro = contraste(fondo, TEXTO_OSCURO);

  if (razonOscuro === null) return null;

  return razonClaro >= razonOscuro ? TEXTO_CLARO : TEXTO_OSCURO;
};
