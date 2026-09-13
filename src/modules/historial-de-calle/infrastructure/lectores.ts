import { listarIntervencionesDeCalleEnTransaccion } from "@/modules/intervenciones";
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
    return listarIntervencionesDeCalleEnTransaccion(tx, calleId);
  },
};
