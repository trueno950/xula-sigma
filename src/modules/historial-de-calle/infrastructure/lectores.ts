import {
  ETIQUETA_DE_ESTADO_DE_INTERVENCION,
  ETIQUETA_DE_TIPO_DE_INTERVENCION,
  listarIntervencionesDeCalleEnTransaccion,
} from "@/modules/intervenciones";
import { listarReportesDeCalleEnTransaccion } from "@/modules/reportes";
import {
  callePorIdEnTransaccion,
  comoCalleId as comoCalleIdDeTerritorio,
} from "@/modules/territorio";
import type { FuentesDeHistorial } from "../application/puertos";

export const fuentesDeHistorial: FuentesDeHistorial = {
  async callePorId(tx, calleId) {
    const calle = await callePorIdEnTransaccion(
      tx,
      comoCalleIdDeTerritorio(calleId),
    );
    return calle?.eventos ?? null;
  },

  async reportesPorCalle(tx, calleId) {
    return listarReportesDeCalleEnTransaccion(tx, calleId);
  },

  async intervencionesPorCalle(tx, calleId) {
    const filas = await listarIntervencionesDeCalleEnTransaccion(tx, calleId);

    return filas.map((fila) => ({
      id: fila.id,
      fechaDeOcurrencia: fila.fechaDeOcurrencia,
      tipo: ETIQUETA_DE_TIPO_DE_INTERVENCION[fila.tipo],
      estado: ETIQUETA_DE_ESTADO_DE_INTERVENCION[fila.estado],
      reporteId: fila.reporteId,
    }));
  },
};
