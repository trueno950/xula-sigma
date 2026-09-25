import {
  puedeSerRaiz,
  TIPOS_DE_LUGAR,
  type TipoDeLugar,
  tiposContenidosPor,
} from "../domain";

/**
 * Los tipos que el alta de un lugar ofrece. Con padre, los que ese padre
 * contiene. Sin padre, los que pueden ser raiz -salvo la cabecera cuando el
 * municipio ya tiene una: `lugares_una_cabecera` la rechazaria al enviar.
 * Esconder la opcion no es la regla; la regla es el indice y su error de
 * dominio, que el caso de uso sigue lanzando.
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
