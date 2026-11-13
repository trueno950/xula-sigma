import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarUsuarios } from "@/shared/auth/roles";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { UsuarioDelPanel } from "../domain";
import type { DirectorioDeUsuarios } from "./puertos";

/**
 * El listado del ayuntamiento para la pantalla del `ADMIN_MUNICIPAL` (S1 y
 * S2).
 *
 * **La guarda de rol esta aca y no en la pantalla**: la pantalla tambien la
 * hace, pero ocultar un listado no es autorizacion (`05-seguridad.md`
 * seccion 6). La consulta del adaptador no filtra por `ayuntamiento_id`: el
 * tenant lo fija este `withTenant`, y que la consulta no filtre es lo que
 * prueba `usuarios.isolation.test.ts`.
 */
export function crearListarUsuarios(directorio: DirectorioDeUsuarios) {
  return async function listarUsuarios(
    contexto: ContextoActual,
  ): Promise<readonly UsuarioDelPanel[]> {
    if (!puedeAdministrarUsuarios(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    return withTenant(contexto.ayuntamientoId, (tx) => directorio.listar(tx));
  };
}
