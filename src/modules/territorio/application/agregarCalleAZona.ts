import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  CalleFueraDelAsentamientoError,
  type CalleId,
  type ZonaId,
} from "../domain";
import type { RepositorioDeAdministracionDeZonas } from "./puertosDeAdministracionDeZonas";

/**
 * Agrega una calle a una zona. La pertenencia es M:N (Rebanada B1) pero
 * acotada: la calle tiene que ser del mismo asentamiento que la zona, o no
 * hay zona que armar. Repetir la pertenencia es idempotente y no deja
 * bitacora: la PK compuesta de `calles_de_zonas` ya expresa esa regla y un
 * segundo POST del mismo boton no es un evento auditable.
 *
 * La bitacora usa `zonaId/calleId` como `entidadId` porque esa pareja ES
 * la clave primaria de la fila; una traza con solo uno de los dos no
 * identificaria nada.
 */
export function crearAgregarCalleAZona(
  repositorio: RepositorioDeAdministracionDeZonas,
) {
  return async function agregarCalleAZona(
    ids: { zonaId: ZonaId; calleId: CalleId },
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const zona = await repositorio.bloquearPorId(tx, ids.zonaId);
      if (!zona) throw new NoEncontradoError();

      const calle = await repositorio.calleActivaPorId(tx, ids.calleId);
      if (!calle) throw new NoEncontradoError();
      if (calle.lugarId !== zona.lugarId) {
        throw new CalleFueraDelAsentamientoError();
      }

      const yaPertenece = await repositorio.perteneceLaCalle(tx, ids);
      if (yaPertenece) return;

      await repositorio.agregarCalle(tx, {
        zonaId: ids.zonaId,
        calleId: ids.calleId,
        lugarId: zona.lugarId,
        ayuntamientoId: contexto.ayuntamientoId,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "AGREGAR_CALLE_A_ZONA",
        entidad: "calles_de_zonas",
        entidadId: `${ids.zonaId}/${ids.calleId}`,
      });
    });
  };
}
