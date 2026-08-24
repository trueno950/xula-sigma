import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { LugarId } from "../domain";
import type { NodoDeSubarbol, RepositorioDeLugares } from "./puertos";

/**
 * Sin guarda de rol, mismo criterio que `personaPorId` de `padron`: leer
 * el arbol territorial no es escribirlo. `ui/ArbolDeLugares.tsx` la
 * consume para no importar `infrastructure` (tabla de capas,
 * `docs/architecture/estructura.md`).
 */
export function crearSubarbol(repositorio: RepositorioDeLugares) {
  return function subarbol(
    raizId: LugarId,
    contexto: ContextoActual,
  ): Promise<readonly NodoDeSubarbol[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.subarbol(tx, raizId),
    );
  };
}
