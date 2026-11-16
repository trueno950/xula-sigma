/**
 * Un icono por tipo de hecho. El catalogo es cerrado y propio del mapa: no
 * importa el de `reportes` ni el de `intervenciones` (antipatron 8), y un tipo
 * que todavia no conoce cae a `OTRO` en vez de desaparecer del mapa.
 */
export const CLAVES_DE_ICONO = [
  "BACHE",
  "ALUMBRADO",
  "FUGA",
  "BASURA",
  "PARQUE",
  "OBRA",
  "REPAVIMENTACION",
  "PAVIMENTACION",
  "MEJORA",
  "MANTENIMIENTO",
  "OTRO",
] as const;

export type ClaveDeIcono = (typeof CLAVES_DE_ICONO)[number];

const ICONO_POR_TIPO: Readonly<Record<string, ClaveDeIcono>> = {
  BACHE: "BACHE",
  ALUMBRADO: "ALUMBRADO",
  FUGA: "FUGA",
  BASURA: "BASURA",
  PARQUE: "PARQUE",
  OBRA: "OBRA",
  REPAVIMENTACION: "REPAVIMENTACION",
  PAVIMENTACION: "PAVIMENTACION",
  MEJORA: "MEJORA",
  MANTENIMIENTO: "MANTENIMIENTO",
  OTRO: "OTRO",
};

export const iconoDe = (tipo: string): ClaveDeIcono =>
  ICONO_POR_TIPO[tipo] ?? "OTRO";
