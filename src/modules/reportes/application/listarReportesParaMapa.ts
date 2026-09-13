import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type {
  LectorDeReportesDeMapa,
  ReporteParaMapa,
} from "./puertosDeLecturaDeReportes";

/**
 * Sin guarda de rol a proposito, mismo criterio que `callesParaMapa`: leer
 * el mapa no es administrar. La sesion y el tenant los pone el borde; el
 * `ayuntamientoId` sale del contexto del servidor.
 */
export function crearListarReportesParaMapa(lector: LectorDeReportesDeMapa) {
  return function listarReportesParaMapa(
    contexto: ContextoActual,
  ): Promise<readonly ReporteParaMapa[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      lector.listarParaMapa(tx),
    );
  };
}
