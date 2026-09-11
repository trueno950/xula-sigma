export const ESTADOS_DE_INTERVENCION = [
  "PLANIFICADA",
  "EN_EJECUCION",
  "FINALIZADA",
  "CANCELADA",
] as const;

export type EstadoDeIntervencion = (typeof ESTADOS_DE_INTERVENCION)[number];

const TRANSICIONES: Record<
  EstadoDeIntervencion,
  readonly EstadoDeIntervencion[]
> = {
  PLANIFICADA: ["EN_EJECUCION", "CANCELADA"],
  EN_EJECUCION: ["FINALIZADA", "CANCELADA"],
  FINALIZADA: [],
  CANCELADA: [],
};

export const transicionValida = (
  desde: EstadoDeIntervencion,
  hacia: EstadoDeIntervencion,
): boolean => TRANSICIONES[desde].includes(hacia);

export const esTerminal = (estado: EstadoDeIntervencion): boolean =>
  TRANSICIONES[estado].length === 0;

export class TransicionInvalidaError extends Error {
  readonly codigo = "TRANSICION_INVALIDA";

  constructor(mensaje = "La transicion de estado no es valida.") {
    super(mensaje);
    this.name = "TransicionInvalidaError";
  }
}

export class IntervencionCerradaError extends Error {
  readonly codigo = "INTERVENCION_CERRADA";

  constructor(mensaje = "La intervencion ya esta en un estado terminal.") {
    super(mensaje);
    this.name = "IntervencionCerradaError";
  }
}
