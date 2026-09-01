import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type {
  FiltrosDeListado,
  ReporteGuardado,
  RepositorioDeReportes,
} from "./puertos";

/**
 * Lista los reportes del ayuntamiento del contexto. Sin guarda de rol
 * propia, mismo criterio que `reportePorId` y `constanciaPorId`: leer no es
 * escribir y RLS ya acota. Los filtros pasan tal cual al repositorio.
 */
export function crearListarReportes(
  repositorio: Pick<RepositorioDeReportes, "listar">,
) {
  return function listarReportes(
    filtros: FiltrosDeListado,
    contexto: ContextoActual,
  ): Promise<readonly ReporteGuardado[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.listar(tx, filtros),
    );
  };
}
