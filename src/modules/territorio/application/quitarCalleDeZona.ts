import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { CalleId, ZonaId } from "../domain";
import type { RepositorioDeAdministracionDeZonas } from "./puertosDeAdministracionDeZonas";

/**
 * Quita una calle de una zona. El DELETE fisico de la pertenencia es el
 * unico autorizado sobre `calles_de_zonas`: la fila no guarda historial y
 * el borrado se recupera re-agregando. Una pertenencia que no existe
 * responde `NoEncontradoError` -no error de PK ni exito silencioso- porque
 * para la operadora el recurso que pidio quitar es esa pertenencia.
 */
export function crearQuitarCalleDeZona(
  repositorio: RepositorioDeAdministracionDeZonas,
) {
  return async function quitarCalleDeZona(
    ids: { zonaId: ZonaId; calleId: CalleId },
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const zona = await repositorio.bloquearPorId(tx, ids.zonaId);
      if (!zona) throw new NoEncontradoError();

      const pertenece = await repositorio.perteneceLaCalle(tx, ids);
      if (!pertenece) throw new NoEncontradoError();

      await repositorio.quitarCalle(tx, ids);

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "QUITAR_CALLE_DE_ZONA",
        entidad: "calles_de_zonas",
        entidadId: `${ids.zonaId}/${ids.calleId}`,
      });
    });
  };
}
