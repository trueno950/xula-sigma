import { listarIntervencionesParaMapa } from "@/modules/intervenciones";
import { listarReportesParaMapa } from "@/modules/reportes";
import {
  callesParaMapa,
  comoLugarId,
  listarRaices,
  subarbol,
} from "@/modules/territorio";
import type { FuentesDeMapa } from "../application";

export const fuentesDeMapa: FuentesDeMapa = {
  async callesParaMapa(contexto) {
    const calles = await callesParaMapa(contexto);
    return calles.map(({ id, nombre, lugarId, punto }) => ({
      id,
      nombre,
      lugarId,
      punto,
    }));
  },
  async reportesParaMapa(contexto) {
    const reportes = await listarReportesParaMapa(contexto);
    return reportes.map(
      ({ id, folio, tipo, estado, areaResponsable, calleId, lugarId }) => ({
        id,
        folio,
        tipo,
        estado,
        areaResponsable,
        calleId,
        lugarId,
      }),
    );
  },
  async intervencionesParaMapa(contexto) {
    const intervenciones = await listarIntervencionesParaMapa(contexto);
    return intervenciones.map(({ id, tipo, estado, calleId, lugarId }) => ({
      id,
      tipo,
      estado,
      calleId,
      lugarId,
    }));
  },
  async territoriosParaMapa(contexto) {
    const raices = await listarRaices(contexto);
    return raices.map(({ id, nombre }) => ({ id, nombre }));
  },
  async lugaresDelSubarbol(contexto, lugarId) {
    const nodos = await subarbol(comoLugarId(lugarId), contexto, {
      soloLugares: true,
    });
    return nodos
      .filter((nodo) => nodo.clase === "lugar")
      .map((nodo) => String(nodo.id));
  },
};
