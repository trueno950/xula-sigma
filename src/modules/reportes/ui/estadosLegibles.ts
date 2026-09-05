import type { AreaResponsable, EstadoDeReporte } from "../domain";

/**
 * Un solo lugar para el texto legible de cada estado: `ListadoDeReportes`
 * lo usa en la fila y `FiltrosDeReportes` en el chip, y las dos copias ya
 * habian empezado a divergir cuando vivian cada una en su archivo
 * (`AGENTS.md`, antipatron 23).
 */
export const ESTADOS_LEGIBLES: Record<EstadoDeReporte, string> = {
  RECIBIDO: "Recibido",
  EN_ATENCION: "En atencion",
  RESUELTO: "Resuelto",
  RECHAZADO: "Rechazado",
};

/** "Sin asignar" solo tiene sentido para quien puede asignar (decision 6). */
export const textoDeArea = (
  area: AreaResponsable | null,
  puedeAdministrar: boolean,
): string => {
  if (area) return area;
  return puedeAdministrar ? "Sin asignar" : "—";
};
