import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { LugarId } from "../domain";
import type { CalleGuardada, RepositorioDeCalles } from "./puertos";

/**
 * Sin guarda de rol a proposito, mismo criterio que `listarPersonas`: leer
 * el catalogo de calles no es escribirlo. Alimenta `SelectorDeCalle` para
 * cualquier rol que pueda ver la pagina de territorio.
 */
export function crearListarCalles(repositorio: RepositorioDeCalles) {
  return function listarCalles(
    lugarId: LugarId,
    contexto: ContextoActual,
  ): Promise<readonly CalleGuardada[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.listarPorLugar(tx, lugarId),
    );
  };
}
