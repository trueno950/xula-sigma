import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

/**
 * Sin guarda de rol a proposito, mismo criterio que `listarRaices`: leer
 * el catalogo no es escribirlo. Alimenta el selector de "lugar padre" del
 * alta desde la entrada de `/territorio`, donde no hay subarbol cargado.
 */
export function crearListarLugares(repositorio: RepositorioDeLugares) {
  return function listarLugares(
    contexto: ContextoActual,
  ): Promise<readonly LugarGuardado[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.listarLugares(tx),
    );
  };
}
