import { comoReporteId, reporteExisteEnTransaccion } from "@/modules/reportes";
import type { LecturaDeReportes } from "../application/puertosDeLectura";

export const crearLectorDeReportesPorReportes = (): LecturaDeReportes => ({
  porId: (tx, reporteId) =>
    reporteExisteEnTransaccion(tx, comoReporteId(reporteId)),
});
