import type { ContextoActual } from "@/shared/auth/contexto";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { PersonaGuardada, RepositorioDePersonas } from "./puertos";

/**
 * Sin guarda de rol a proposito: leer el padron no es escribirlo
 * (`puedeEscribir` acota alta, edicion y baja, no la lectura), y
 * `PRODUCT.md` describe un rol de solo lectura (`Secretario / Consulta`)
 * al que negarle esto seria incorrecto. `bajaEn` no nulo ya queda afuera
 * del lado del repositorio.
 *
 * Unico lugar que explica esta decision: `listarPersonas.test.ts` y
 * `app/(panel)/padron/page.tsx` apuntan aca en vez de repetirla.
 */
export function crearListarPersonas(repositorio: RepositorioDePersonas) {
  return function listarPersonas(
    contexto: ContextoActual,
  ): Promise<readonly PersonaGuardada[]> {
    return withTenant(contexto.ayuntamientoId, (tx) => repositorio.listar(tx));
  };
}
