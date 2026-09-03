import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { ReporteId } from "../domain";
import type { MovimientoGuardado, RegistroDeMovimientos } from "./puertos";

/**
 * Lectura del historial para `DetalleDeReporte` (tasks.md 7.6). Sin guarda
 * de rol, mismo criterio que `reportePorId` y `historialDeResidencias` de
 * `territorio`: leer no es escribir.
 */
export function crearHistorialDeReporte(
  movimientos: Pick<RegistroDeMovimientos, "historialDe">,
) {
  return function historialDeReporte(
    reporteId: ReporteId,
    contexto: ContextoActual,
  ): Promise<readonly MovimientoGuardado[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      movimientos.historialDe(tx, reporteId),
    );
  };
}
