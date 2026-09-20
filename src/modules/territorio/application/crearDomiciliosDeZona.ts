import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { ZonaId } from "../domain";
import type { RepositorioDeCallesDeZonas } from "./puertosDeZonas";

export function crearDomiciliosDeZona(repositorio: RepositorioDeCallesDeZonas) {
  return function domiciliosDeZona(zonaId: ZonaId, contexto: ContextoActual) {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.domiciliosDeZona(tx, zonaId),
    );
  };
}
