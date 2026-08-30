/**
 * Categorias cerradas de reimpresion y cancelacion. Sin `OTRO`: un motivo
 * de texto libre es exactamente el dato sensible sin proteger que
 * `CLAUDE.md` prohibe para categorias de este tipo.
 */
export const MOTIVOS_DE_REIMPRESION = [
  "EXTRAVIO",
  "DETERIORO",
  "EJEMPLAR_ADICIONAL",
] as const;

export type MotivoDeReimpresion = (typeof MOTIVOS_DE_REIMPRESION)[number];

export const MOTIVOS_DE_CANCELACION = [
  "ERROR_DE_CAPTURA",
  "DATOS_INCORRECTOS",
  "SOLICITUD_DEL_INTERESADO",
] as const;

export type MotivoDeCancelacion = (typeof MOTIVOS_DE_CANCELACION)[number];
