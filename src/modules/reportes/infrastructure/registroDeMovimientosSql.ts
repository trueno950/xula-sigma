import { asc, eq } from "drizzle-orm";
import type {
  MovimientoGuardado,
  RegistroDeMovimientos,
} from "../application/puertosDeMovimientos";
import { movimientosDeReportes } from "./esquema";

const aMovimientoGuardado = (
  fila: typeof movimientosDeReportes.$inferSelect,
): MovimientoGuardado => ({
  id: fila.id,
  ayuntamientoId: fila.ayuntamientoId,
  reporteId: fila.reporteId,
  usuarioId: fila.usuarioId,
  estadoAnterior: fila.estadoAnterior,
  estadoNuevo: fila.estadoNuevo,
  areaAsignada: fila.areaAsignada,
  motivo: fila.motivo,
  ocurridoEn: fila.ocurridoEn,
});

/**
 * Implementacion real de `RegistroDeMovimientos`. La tabla es de solo
 * agregado: el `GRANT` no le da `UPDATE` ni `DELETE` a `xula_app`
 * (design.md seccion 6), y `agregar` es un INSERT a secas. `historialDe`
 * ordena por `ocurridoEn ASC` -parte del contrato, design.md seccion 10-.
 */
export const registroDeMovimientosSql: RegistroDeMovimientos = {
  async agregar(tx, datos) {
    await tx.insert(movimientosDeReportes).values(datos);
  },

  async historialDe(tx, reporteId) {
    const filas = await tx
      .select()
      .from(movimientosDeReportes)
      .where(eq(movimientosDeReportes.reporteId, reporteId))
      .orderBy(asc(movimientosDeReportes.ocurridoEn));

    return filas.map(aMovimientoGuardado);
  },
};
