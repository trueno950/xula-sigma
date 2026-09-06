import type { EstadoDeConstancia } from "../domain";

/**
 * Un solo lugar para el texto legible de cada estado: `FiltrosDeConstancias`
 * lo usa en el chip. Mismo criterio que `reportes/ui/estadosLegibles.ts`
 * (`AGENTS.md`, antipatron 23).
 */
export const ESTADOS_LEGIBLES: Record<EstadoDeConstancia, string> = {
  VIGENTE: "Vigente",
  CANCELADA: "Cancelada",
};
