/** Clasificacion cerrada de una incidencia de via publica (decision 3). */
export const TIPOS_DE_INCIDENCIA = [
  "BACHE",
  "ALUMBRADO",
  "FUGA",
  "BASURA",
  "PARQUE",
  "OTRO",
] as const;

export type TipoDeIncidencia = (typeof TIPOS_DE_INCIDENCIA)[number];
