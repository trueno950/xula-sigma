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
 * La bitacora ancla en la zona, no en la pareja: `bitacora.entidad_id` es
 * una columna uuid y la clave de `calles_de_zonas` es un par, asi que un
 * `zonaId/calleId` compuesto llega a Postgres como texto y revienta con
 * 22P02 -paso en la corrida local del 2026-10-23, con los tests en verde
 * porque el puerto iba mockeado-. Se elige la zona porque la operadora
 * cura una zona: la traza responde quien toco esta zona y cuando. La calle
 * concreta queda en la fila de `calles_de_zonas` que esta misma accion
 * crea, con su `creado_en`.
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
        entidadId: ids.zonaId,
      });
    });
  };
}
