import { ETIQUETA_DE_TIPO_DE_LUGAR, type TipoDeLugar } from "../domain";

/**
 * La palabra del tipo de lugar para la pastilla del titulo. Vive en `ui`
 * porque `app` no importa `domain`: lee el tipo ya resuelto, no sus reglas.
 */
export const etiquetaDeTipo = (tipo: TipoDeLugar): string =>
  ETIQUETA_DE_TIPO_DE_LUGAR[tipo];
