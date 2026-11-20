import { desc, eq } from "drizzle-orm";
import type { LectorDeObrasDeReporte } from "../application/obrasDeReporte";
import { intervenciones } from "./esquema";

/**
 * Las obras de un reporte, por `intervenciones_reporte_idx` (migracion de
 * `intervenciones-trazabilidad`). Columnas explicitas: la ficha solo enlaza
 * la obra y la nombra por su tipo, y `descripcion` -texto libre donde la
 * operadora pudo escribir de mas- no tiene por que viajar hasta una pantalla
 * que no la muestra.
 */
export const obrasDeReporteSql: LectorDeObrasDeReporte = {
  listar(tx, reporteId) {
    return tx
      .select({
        id: intervenciones.id,
        tipo: intervenciones.tipo,
        estado: intervenciones.estado,
        fechaDeOcurrencia: intervenciones.fechaDeOcurrencia,
      })
      .from(intervenciones)
      .where(eq(intervenciones.reporteId, reporteId))
      .orderBy(desc(intervenciones.capturadoEn));
  },
};
