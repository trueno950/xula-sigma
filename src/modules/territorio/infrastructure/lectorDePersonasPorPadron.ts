import { identidadesDePersona, personaPorId } from "@/modules/padron";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { LecturaDePersonas } from "../application/puertos";

/**
 * Implementacion real de `LecturaDePersonas` contra los casos de uso de
 * `padron`, no contra su repositorio: `personas` es inalcanzable fuera de
 * `padron` (design.md decision 4), asi que este adaptador es lo unico del
 * modulo que puede cruzar el limite, y lo hace por el barrel. Cada llamada
 * abre su propio `withTenant` -el de `padron`-, nunca el de `territorio`
 * (design.md seccion 6).
 */
export const crearLectorDePersonasPorPadron = (
  contexto: ContextoActual,
): LecturaDePersonas => ({
  async terminalDe(id) {
    const persona = await personaPorId(id, contexto);
    return persona?.id ?? null;
  },
  identidadesDe: (id) => identidadesDePersona(id, contexto),
});
