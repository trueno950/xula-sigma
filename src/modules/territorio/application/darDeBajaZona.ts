import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { ZonaId } from "../domain";
import type { RepositorioDeAdministracionDeZonas } from "./puertosDeAdministracionDeZonas";

/**
 * Da de baja una zona activa. La baja es logica: el indice parcial
 * `zonas_tenant_lugar_nombre_idx` solo mira activas, asi que el nombre
 * queda libre para una zona nueva del mismo asentamiento (S6). Los
 * domicilios de la zona se derivan de sus calles en lectura, y el lector
 * ya filtra zonas de baja; no hay dependientes que frenen la baja.
 */
export function crearDarDeBajaZona(
  repositorio: RepositorioDeAdministracionDeZonas,
) {
  return async function darDeBajaZona(
    id: ZonaId,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const existente = await repositorio.bloquearPorId(tx, id);
      if (!existente) throw new NoEncontradoError();

      await repositorio.darDeBaja(tx, id);

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "BAJA_ZONA",
        entidad: "zonas",
        entidadId: id,
      });
    });
  };
}
