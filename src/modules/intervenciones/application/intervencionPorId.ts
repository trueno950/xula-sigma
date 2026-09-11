import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { IntervencionId } from "../domain";
import type {
  IntervencionGuardada,
  RepositorioDeIntervenciones,
} from "./puertos";

export function crearIntervencionPorId(
  repositorio: Pick<RepositorioDeIntervenciones, "buscarPorId">,
) {
  return function intervencionPorId(
    id: IntervencionId,
    contexto: ContextoActual,
  ): Promise<IntervencionGuardada | null> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.buscarPorId(tx, id),
    );
  };
}
