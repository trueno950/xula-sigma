import type { ReporteGuardado } from "../application/puertos";
import type { reportes } from "./esquema";

/**
 * Aparte de `repositorioDeReportesSql.ts` porque `buscarPorId` (ese
 * archivo) y `listar`/`buscar` (`listadoDeReportesSql.ts`) lo necesitan
 * los dos: un archivo compartido evita el ciclo que se armaria si uno le
 * importara el mapeador al otro.
 */
export const aReporteGuardado = (
  fila: typeof reportes.$inferSelect,
): ReporteGuardado => ({
  id: fila.id,
  folio: fila.folio,
  tipo: fila.tipo,
  estado: fila.estado,
  areaResponsable: fila.areaResponsable,
  lugarId: fila.lugarId,
  calleId: fila.calleId,
  referencia: fila.referencia,
  descripcion: fila.descripcion,
  personaId: fila.personaId,
  motivoDeRechazo: fila.motivoDeRechazo,
  duplicadoDeReporteId: fila.duplicadoDeReporteId,
  registradoPorUsuarioId: fila.registradoPorUsuarioId,
  registradoEn: fila.registradoEn,
  actualizadoEn: fila.actualizadoEn,
});
