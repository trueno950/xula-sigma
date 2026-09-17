import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { DomicilioId } from "../domain";
import type {
  DomicilioGuardado,
  RepositorioDeDomicilios,
} from "./puertosDeDomicilios";

/** Sin guarda de rol, mismo criterio que `lugarPorId`/`callePorId`: leer no es escribir. */
export function crearDomicilioPorId(repositorio: RepositorioDeDomicilios) {
  return function domicilioPorId(
    id: DomicilioId,
    contexto: ContextoActual,
  ): Promise<DomicilioGuardado | null> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.buscarPorId(tx, id),
    );
  };
}
