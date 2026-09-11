import type { motul } from "@/shared/tenancy/municipiosDePrueba";
import type { EstadoDeIntervencion, TipoDeIntervencion } from "./domain";

export const intervencionDe = (opciones: {
  ayuntamientoId: typeof motul;
  lugarId: string;
  registradoPorUsuarioId: string;
  tipo?: TipoDeIntervencion;
  estado?: EstadoDeIntervencion;
  calleId?: string | null | undefined;
  reporteId?: string | null | undefined;
}) => ({
  ayuntamientoId: opciones.ayuntamientoId,
  tipo: opciones.tipo ?? "OBRA",
  estado: opciones.estado ?? "PLANIFICADA",
  fechaDeOcurrencia: "2026-01-15",
  lugarId: opciones.lugarId,
  calleId: opciones.calleId ?? null,
  reporteId: opciones.reporteId ?? null,
  descripcion: "Rehabilitacion del parque municipal",
  registradoPorUsuarioId: opciones.registradoPorUsuarioId,
});
