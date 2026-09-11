import type { IntervencionGuardada } from "../application/puertos";
import type { intervenciones } from "./esquema";

export const aIntervencionGuardada = (
  fila: typeof intervenciones.$inferSelect,
): IntervencionGuardada => ({
  id: fila.id,
  tipo: fila.tipo,
  estado: fila.estado,
  fechaDeOcurrencia: fila.fechaDeOcurrencia,
  lugarId: fila.lugarId,
  calleId: fila.calleId,
  reporteId: fila.reporteId,
  descripcion: fila.descripcion,
  registradoPorUsuarioId: fila.registradoPorUsuarioId,
  capturadoEn: fila.capturadoEn,
  actualizadoEn: fila.actualizadoEn,
});
