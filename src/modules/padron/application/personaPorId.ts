import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { PersonaId } from "../domain";
import type { PersonaGuardada, RepositorioDePersonas } from "./puertos";

/**
 * Lectura por id compuesta para otro modulo (design.md decision 5 de
 * capa-territorial). Sin guarda de rol, mismo criterio que
 * `listarPersonas`: leer el padron no es escribirlo. `null` cuando el id
 * no existe o es de otro tenant -las dos cosas se ven igual del lado de
 * quien pregunta-, nunca lanza: quien decide que eso es un 404 es el
 * borde, no esta lectura.
 */
export function crearPersonaPorId(repositorio: RepositorioDePersonas) {
  return function personaPorId(
    id: PersonaId,
    contexto: ContextoActual,
  ): Promise<PersonaGuardada | null> {
    return withTenant(contexto.ayuntamientoId, (tx) =>
      repositorio.buscarPorId(tx, id),
    );
  };
}
