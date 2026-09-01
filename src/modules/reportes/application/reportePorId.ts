import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { ReporteId } from "../domain";
import type { ReporteGuardado, RepositorioDeReportes } from "./puertos";

/**
 * Lectura por id, sin guarda de rol propia -mismo criterio que
 * `constanciaPorId`: leer no es escribir, y RLS ya acota al tenant-. `null`
 * cuando el id no existe o es de otro tenant -los dos se ven igual del lado
 * de quien pregunta-, nunca lanza: quien decide que eso es un 404 es el
 * borde.
 */
export function crearReportePorId(
  repositorio: Pick<RepositorioDeReportes, "buscarPorId">,
) {
  return function reportePorId(
    id: ReporteId,
    contexto: ContextoActual,
  ): Promise<ReporteGuardado | null> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.buscarPorId(tx, id),
    );
  };
}
