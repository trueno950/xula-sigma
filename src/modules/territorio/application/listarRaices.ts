import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

/**
 * Sin guarda de rol a proposito, mismo criterio que `listarCalles` y
 * `listarDomicilios`: leer el catalogo no es escribirlo. Alimenta la
 * entrada de `/territorio` para elegir la raiz del arbol con un clic.
 */
export function crearListarRaices(repositorio: RepositorioDeLugares) {
  return function listarRaices(
    contexto: ContextoActual,
  ): Promise<readonly LugarGuardado[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.listarRaices(tx),
    );
  };
}
