import type { PersonaId } from "@/modules/padron";
import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { LugarId } from "../domain";
import type {
  RepositorioDeDomicilios,
  RepositorioDeResidencias,
} from "./puertos";

/**
 * Personas con residencia vigente en el subarbol de un lugar. Sin guarda de
 * rol -leer no es escribir-. Reusa el `WITH RECURSIVE` de
 * `RepositorioDeDomicilios.porLugarYSubarbol` -la unica pieza recursiva del
 * modulo- para resolver los domicilios del sector, y filtra `residencias`
 * sobre esos ids con el builder de Drizzle (design.md seccion 12).
 */
export function crearResidentesDe(
  repositorioDeDomicilios: RepositorioDeDomicilios,
  repositorioDeResidencias: RepositorioDeResidencias,
) {
  return function residentesDe(
    lugarId: LugarId,
    contexto: ContextoActual,
  ): Promise<readonly PersonaId[]> {
    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const domicilios = await repositorioDeDomicilios.porLugarYSubarbol(
        tx,
        lugarId,
      );
      return repositorioDeResidencias.residentesDe(
        tx,
        domicilios.map((domicilio) => domicilio.id),
      );
    });
  };
}
