export const ESTADOS_DE_REPORTE = [
  "RECIBIDO",
  "EN_ATENCION",
  "RESUELTO",
  "RECHAZADO",
] as const;

export type EstadoDeReporte = (typeof ESTADOS_DE_REPORTE)[number];

/**
 * `Record<EstadoDeReporte, …>` y no un objeto suelto: agregar un estado a la
 * union rompe el tipo hasta que alguien decida sus salidas, en vez de
 * heredar en silencio "sin transiciones" (design.md seccion 7).
 *
 * `RECIBIDO -> RESUELTO` directo esta a proposito: exigir el paso por
 * `EN_ATENCION` cuando la cuadrilla resuelve el mismo dia no produce un
 * registro mas fiel, produce dos clics con la misma marca de tiempo.
 */
const TRANSICIONES: Record<EstadoDeReporte, readonly EstadoDeReporte[]> = {
  RECIBIDO: ["EN_ATENCION", "RESUELTO", "RECHAZADO"],
  EN_ATENCION: ["RESUELTO", "RECHAZADO"],
  RESUELTO: [],
  RECHAZADO: [],
};

export const transicionValida = (
  desde: EstadoDeReporte,
  hacia: EstadoDeReporte,
): boolean => TRANSICIONES[desde].includes(hacia);

export const esTerminal = (estado: EstadoDeReporte): boolean =>
  TRANSICIONES[estado].length === 0;
