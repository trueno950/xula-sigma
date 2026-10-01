import {
  puedeSerRaiz,
  TIPOS_DE_LUGAR,
  type TipoDeLugar,
  tiposContenidosPor,
} from "../domain";

/**
 * Los tipos que el alta de un lugar ofrece. Lo que de verdad cierra el
 * camino es el indice `lugares_una_cabecera` y su `CabeceraDuplicadaError`:
 * esconder una opcion no es una regla.
 */
export const tiposParaElAlta = ({
  tipoDelPadre,
  hayCabecera,
}: {
  tipoDelPadre?: TipoDeLugar;
  hayCabecera: boolean;
}): readonly TipoDeLugar[] => {
  if (tipoDelPadre) return tiposContenidosPor(tipoDelPadre);

  return TIPOS_DE_LUGAR.filter(
    (tipo) => puedeSerRaiz(tipo) && !(hayCabecera && tipo === "cabecera"),
  );
};
