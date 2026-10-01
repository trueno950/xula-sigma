import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { RepositorioDeLugares } from "./puertos";

/**
 * Responde si el municipio ya tiene cabecera, para que el alta deje de
 * ofrecerla. Sin guarda de rol a proposito, mismo criterio que
 * `listarLugares`: leer el territorio no es escribirlo.
 *
 * Cuenta tambien las dadas de baja: el indice parcial `lugares_una_cabecera`
 * no tiene clausula de baja, asi que una cabecera vieja sigue ocupando el
 * lugar de la unica y ofrecer otra terminaria en `CabeceraDuplicadaError`
 * despues de enviar. El porque esta en `puertos.ts`.
 */
export function crearExisteCabecera(repositorio: RepositorioDeLugares) {
  return function existeCabecera(contexto: ContextoActual): Promise<boolean> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.existeCabecera(tx),
    );
  };
}
