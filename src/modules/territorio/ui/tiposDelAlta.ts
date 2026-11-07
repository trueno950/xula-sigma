import {
  puedeSerRaiz,
  TIPOS_DE_LUGAR,
  type TipoDeLugar,
  tipoDeLugarEnFrase,
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

/** El tipo que el alta manda sin preguntar: solo cuando no hay otro. */
export const tipoUnicoDelAlta = (
  tipos: readonly TipoDeLugar[],
): TipoDeLugar | undefined => (tipos.length === 1 ? tipos[0] : undefined);

/**
 * El titulo del panel del alta. "Nueva" vale para los tres tipos del
 * catalogo porque los tres son femeninos: cabecera, comisaria, colonia.
 */
export const tituloDelAlta = ({
  tipos,
  dentroDe,
}: {
  tipos: readonly TipoDeLugar[];
  dentroDe?: string;
}): string => {
  const unico = tipoUnicoDelAlta(tipos);
  const lugar = dentroDe ? ` en ${dentroDe}` : "";

  if (unico) return `Nueva ${tipoDeLugarEnFrase(unico)}${lugar}`;

  return dentroDe
    ? `Agregar un lugar dentro de ${dentroDe}`
    : "Agregar asentamiento";
};

/** "Agregar colonia" con un solo tipo; sin el, cada boton dice el suyo. */
export const verboDelAlta = (
  tipos: readonly TipoDeLugar[],
): string | undefined => {
  const unico = tipoUnicoDelAlta(tipos);

  return unico ? `Agregar ${tipoDeLugarEnFrase(unico)}` : undefined;
};
