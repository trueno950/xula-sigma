import { reporteParaIntervencion } from "@/modules/reportes";
import type { ReportesParaObra } from "../application/puertosDeReportes";

/**
 * El unico punto donde `intervenciones` habla con `reportes`: el puerto es de
 * este modulo y el adaptador traduce a las operaciones del otro, que corren
 * con el `tx` recibido y no abren transaccion propia.
 */
export const crearReportesParaObraPorReportes = (): ReportesParaObra => ({
  de: (tx, reporteId) => reporteParaIntervencion.leer(tx, reporteId),
  mover: (tx, datos) => reporteParaIntervencion.mover(tx, datos),
});
