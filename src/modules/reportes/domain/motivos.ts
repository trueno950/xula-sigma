/**
 * Motivo de rechazo cerrado, sin `OTRO` -a diferencia de
 * `TIPOS_DE_INCIDENCIA`-: un `OTRO` con texto libre al lado recogeria
 * exactamente el dato que `CLAUDE.md` prohibe para una categoria cerrada.
 */
export const MOTIVOS_DE_RECHAZO = [
  "DUPLICADO",
  "FUERA_DE_COMPETENCIA",
  "INFORMACION_INSUFICIENTE",
] as const;

export type MotivoDeRechazo = (typeof MOTIVOS_DE_RECHAZO)[number];
