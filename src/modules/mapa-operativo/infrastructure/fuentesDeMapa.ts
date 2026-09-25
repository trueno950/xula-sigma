import { listarIntervencionesParaMapa } from "@/modules/intervenciones";
import { listarReportesParaMapa } from "@/modules/reportes";
import { callesParaMapa } from "@/modules/territorio";
import type { FuentesDeMapa } from "../application";

export const fuentesDeMapa: FuentesDeMapa = {
  async callesParaMapa(contexto) {
    const calles = await callesParaMapa(contexto);
    return calles.map(({ id, nombre, punto }) => ({ id, nombre, punto }));
  },
  async reportesParaMapa(contexto) {
    const reportes = await listarReportesParaMapa(contexto);
    return reportes.map(
      ({ id, folio, tipo, estado, areaResponsable, calleId }) => ({
        id,
        folio,
        tipo,
        estado,
        areaResponsable,
        calleId,
      }),
    );
  },
  async intervencionesParaMapa(contexto) {
    const intervenciones = await listarIntervencionesParaMapa(contexto);
    return intervenciones.map(({ id, tipo, estado, calleId }) => ({
      id,
      tipo,
      estado,
      calleId,
    }));
  },
};
