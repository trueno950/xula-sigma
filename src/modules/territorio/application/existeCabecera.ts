import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { RepositorioDeLugares } from "./puertos";

/**
 * Responde si el municipio ya tiene cabecera, para que el alta deje de
 * ofrecerla. Sin guarda de rol a proposito, mismo criterio que
 * `listarLugares`: leer el territorio no es escribirlo.
 *
 * Solo cuenta cabeceras activas, igual que `lugares_una_cabecera`: si
 * divergieran, el alta ofreceria una cabecera que el indice rechaza, o
 * esconderia una que el indice acepta.
 */
export function crearExisteCabecera(repositorio: RepositorioDeLugares) {
  return function existeCabecera(contexto: ContextoActual): Promise<boolean> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.existeCabecera(tx),
    );
  };
}
