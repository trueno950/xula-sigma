import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { CalleId } from "../domain";
import type { RepositorioDeCalles } from "./puertos";

/**
 * Renombra una calle. Mismo esqueleto que `reparentearLugar` (design.md
 * seccion 9): el unico rechazo propio es el choque contra
 * `calles_tenant_lugar_nombre_idx`, que el repositorio traduce a
 * `NombreDeCalleDuplicadoError` y este caso de uso deja propagar sin
 * envolverla.
 */
export function crearRenombrarCalle(repositorio: RepositorioDeCalles) {
  return async function renombrarCalle(
    id: CalleId,
    nombre: string,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const actualizada = await repositorio.actualizar(tx, { id, nombre });
      if (!actualizada) throw new NoEncontradoError();

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "RENOMBRAR_CALLE",
        entidad: "calles",
        entidadId: id,
      });
    });
  };
}
