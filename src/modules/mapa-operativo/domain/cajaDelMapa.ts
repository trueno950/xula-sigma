import type { CajaDeMapa, PuntoDeMapa } from "./mapaOperativo";

/**
 * Margen minimo de la caja, en grados: poco mas de medio kilometro por lado.
 * Sin el, un territorio con una sola calle ubicada quedaria con una caja de
 * area cero y `maxBounds` no acotaria nada.
 */
export const MARGEN_DE_CAJA_EN_GRADOS = 0.005;

const extremos = (valores: readonly number[]) => {
  let minimo = Number.POSITIVE_INFINITY;
  let maximo = Number.NEGATIVE_INFINITY;
  for (const valor of valores) {
    if (valor < minimo) minimo = valor;
    if (valor > maximo) maximo = valor;
  }
  return { minimo, maximo };
};

const margenDe = ({ minimo, maximo }: ReturnType<typeof extremos>) =>
  Math.max(MARGEN_DE_CAJA_EN_GRADOS, (maximo - minimo) / 10);

/**
 * La caja que contiene los puntos, con margen, o `null` si no hay ninguno.
 * El `null` no es un cero: es la ausencia de territorio que el mapa tiene
 * que declarar en vez de inventar un centro (`AGENTS.md`, fecha y hora).
 */
export function cajaDePuntos(
  puntos: readonly PuntoDeMapa[],
): CajaDeMapa | null {
  if (puntos.length === 0) return null;
  const latitudes = extremos(puntos.map((punto) => punto.latitud));
  const longitudes = extremos(puntos.map((punto) => punto.longitud));
  const margenDeLatitud = margenDe(latitudes);
  const margenDeLongitud = margenDe(longitudes);
  return {
    sur: latitudes.minimo - margenDeLatitud,
    oeste: longitudes.minimo - margenDeLongitud,
    norte: latitudes.maximo + margenDeLatitud,
    este: longitudes.maximo + margenDeLongitud,
  };
}
