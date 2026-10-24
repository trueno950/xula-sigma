import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import { NombreDeZonaDuplicadoError, type ZonaId } from "../domain";
import type { RepositorioDeAdministracionDeZonas } from "./puertosDeAdministracionDeZonas";

/**
 * Renombra una zona activa. La unicidad S6 se comprueba contra el
 * asentamiento de la propia zona, no contra un `lugarId` del cliente: el
 * nombre llega por parametro y el lugar no se puede elegir al renombrar.
 * Puede lanzar `NombreDeZonaDuplicadoError`.
 */
export function crearRenombrarZona(
  repositorio: RepositorioDeAdministracionDeZonas,
) {
  return async function renombrarZona(
    id: ZonaId,
    nombre: string,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const existente = await repositorio.bloquearPorId(tx, id);
      if (!existente) throw new NoEncontradoError();

      const repetida = await repositorio.buscarActivaPorNombre(tx, {
        lugarId: existente.lugarId,
        nombre,
      });
      if (repetida && repetida.id !== id) {
        throw new NombreDeZonaDuplicadoError();
      }

      await repositorio.renombrar(tx, { id, nombre });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "RENOMBRAR_ZONA",
        entidad: "zonas",
        entidadId: id,
      });
    });
  };
}
