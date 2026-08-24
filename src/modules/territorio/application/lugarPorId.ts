import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { LugarId } from "../domain";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

/**
 * Sin guarda de rol, mismo criterio que `personaPorId` de `padron`: leer
 * un lugar no es escribirlo. `subarbol` excluye la raiz de sus nodos
 * (`puertos.ts`, `NodoDeSubarbol`), asi que `ArbolDeLugares.tsx` necesita
 * esta lectura aparte para el nombre y tipo de la raiz misma.
 */
export function crearLugarPorId(repositorio: RepositorioDeLugares) {
  return function lugarPorId(
    id: LugarId,
    contexto: ContextoActual,
  ): Promise<LugarGuardado | null> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.buscarPorId(tx, id),
    );
  };
}
