import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { PersonaId } from "../domain";
import type { RepositorioDePersonas } from "./puertos";

/**
 * Direccion inversa de `personaPorId` (design.md decision 5 de
 * capa-territorial): "terminal -> todos los ids que colapsan en el", para
 * que un historial armado sobre una identidad fusionada pueda citar las
 * residencias de ambos ids. Sin guarda de rol -mismo criterio que
 * `listarPersonas`- y es ademas la lectura mas inocua del modulo: solo
 * devuelve uuids, ni un dato personal.
 */
export function crearIdentidadesDePersona(repositorio: RepositorioDePersonas) {
  return function identidadesDePersona(
    id: PersonaId,
    contexto: ContextoActual,
  ): Promise<readonly PersonaId[]> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.identidadesDe(tx, id),
    );
  };
}
