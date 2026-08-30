import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { ConstanciaGuardada, RepositorioDeConstancias } from "./puertos";

/** Lista las constancias del ayuntamiento del contexto. Sin guarda de rol propia, mismo criterio que `constanciaPorId`. */
export function crearListarConstancias(repositorio: RepositorioDeConstancias) {
  return function listarConstancias(
    contexto: ContextoActual,
  ): Promise<readonly ConstanciaGuardada[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.listar(tx, contexto.ayuntamientoId),
    );
  };
}
