/**
 * Naturalezas de un evento estructural de calle. Conjunto cerrado y sin
 * JSON: `ALTA` sirve para notificar una calle nueva; la proyeccion de
 * `historial-de-calle` conserva solo las estructurales, que son las que
 * llevan rango de desempate.
 */
export const NATURALEZAS_DE_EVENTO = [
  "ALTA",
  "RENOMBRE",
  "REPARENTEO",
  "UBICACION",
] as const;

export type NaturalezaDeEvento = (typeof NATURALEZAS_DE_EVENTO)[number];

export const NATURALEZAS_ESTRUCTURALES = [
  "RENOMBRE",
  "REPARENTEO",
  "UBICACION",
] as const;

export type NaturalezaEstructural = (typeof NATURALEZAS_ESTRUCTURALES)[number];

/**
 * Rango fijo del contrato de `callePorId` para el empate exacto de
 * `ocurridoEn`: RENOMBRE < REPARENTEO < UBICACION. El repositorio de
 * lectura lo traduce a SQL; nadie mas lo reimplementa.
 */
export const RANGO_DE_NATURALEZA: Record<NaturalezaEstructural, number> = {
  RENOMBRE: 0,
  REPARENTEO: 1,
  UBICACION: 2,
};
