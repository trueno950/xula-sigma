import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type {
  IntervencionParaMapa,
  LectorDeIntervencionesDeMapa,
} from "./puertosDeLectura";

export function crearListarIntervencionesParaMapa(
  lector: LectorDeIntervencionesDeMapa,
) {
  return function listarIntervencionesParaMapa(
    contexto: ContextoActual,
  ): Promise<readonly IntervencionParaMapa[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      lector.listarParaMapa(tx),
    );
  };
}
