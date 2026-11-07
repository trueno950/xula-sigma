import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { LugarId } from "../domain";
import type { RepositorioDeDomicilios } from "./puertosDeDomicilios";
import type { RepositorioDeResidencias } from "./puertosDeResidencias";

/**
 * Personas con residencia vigente en el subarbol de un lugar. Sin guarda de
 * rol -leer no es escribir-. El reparto entre los dos repositorios esta en
 * `RepositorioDeResidencias` (`puertosDeResidencias.ts`).
 */
export function crearResidentesDe(
  repositorioDeDomicilios: RepositorioDeDomicilios,
  repositorioDeResidencias: RepositorioDeResidencias,
) {
  return function residentesDe(
    lugarId: LugarId,
    contexto: ContextoActual,
  ): Promise<readonly string[]> {
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
