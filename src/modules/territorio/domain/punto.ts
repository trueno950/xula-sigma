export type PuntoGeografico = {
  readonly latitud: number;
  readonly longitud: number;
};

export const CAJA_DE_YUCATAN = {
  latitudMinima: 19.4333,
  latitudMaxima: 21.6667,
  longitudMinima: -90.4667,
  longitudMaxima: -87.4833,
} as const;

export const estaEnYucatan = (punto: PuntoGeografico): boolean =>
  punto.latitud >= CAJA_DE_YUCATAN.latitudMinima &&
  punto.latitud <= CAJA_DE_YUCATAN.latitudMaxima &&
  punto.longitud >= CAJA_DE_YUCATAN.longitudMinima &&
  punto.longitud <= CAJA_DE_YUCATAN.longitudMaxima;

const redondear = (valor: number): number =>
  Math.round((valor + Number.EPSILON) * 1_000_000) / 1_000_000;

export const redondearPunto = (punto: PuntoGeografico): PuntoGeografico => ({
  latitud: redondear(punto.latitud),
  longitud: redondear(punto.longitud),
});
