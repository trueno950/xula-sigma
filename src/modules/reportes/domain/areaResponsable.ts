/**
 * Catalogo cerrado de areas municipales que atienden un reporte (decision
 * 3). Nullable en el registro: se asigna despues, nunca al mostrador.
 */
export const AREAS_RESPONSABLES = [
  "OBRAS_PUBLICAS",
  "ALUMBRADO_PUBLICO",
  "AGUA_POTABLE_Y_DRENAJE",
  "LIMPIA_Y_RECOLECCION",
  "PARQUES_Y_JARDINES",
  "SERVICIOS_GENERALES",
] as const;

export type AreaResponsable = (typeof AREAS_RESPONSABLES)[number];
