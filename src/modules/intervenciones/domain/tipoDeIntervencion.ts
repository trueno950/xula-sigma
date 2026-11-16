export const TIPOS_DE_INTERVENCION = [
  "OBRA",
  "REPAVIMENTACION",
  "PAVIMENTACION",
  "MEJORA",
  "FUGA",
  "ALUMBRADO",
  "BACHE",
  "MANTENIMIENTO",
] as const;

export type TipoDeIntervencion = (typeof TIPOS_DE_INTERVENCION)[number];
