import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  comoZonaId,
  type LugarId,
  NombreDeZonaDuplicadoError,
  puedeTenerZonas,
  type ZonaId,
} from "../domain";
import type { RepositorioDeLugares } from "./puertos";
import type { RepositorioDeAdministracionDeZonas } from "./puertosDeAdministracionDeZonas";

/** Solo `buscarPorId`: el alta no necesita el resto del puerto de lugares. */
type RepositorioDeLugaresPorId = Pick<RepositorioDeLugares, "buscarPorId">;

export type NuevaZona = {
  nombre: string;
  lugarId: LugarId;
};

/**
 * Alta de una zona. Mismo permiso que el resto del territorio
 * (`puedeAdministrarTerritorio`, tasks.md 4.2). Un `lugarId` que no es
 * asentamiento resuelve `NoEncontradoError`: la lista blanca de errores de
 * las acciones de zonas (B3u-GREEN-04) no tiene un error propio para el
 * caso, y desde la pantalla ese lugar nunca se ofrece.
 *
 * Puede lanzar `NombreDeZonaDuplicadoError`: dos zonas activas del mismo
 * asentamiento no pueden llamarse igual (decisión S6); el porque del
 * nombre del asentamiento y no del municipio esta en el diseño del SDD.
 */
export function crearAltaDeZona(
  repositorio: RepositorioDeAdministracionDeZonas,
  repositorioDeLugares: RepositorioDeLugaresPorId,
) {
  return async function altaDeZona(
    datos: NuevaZona,
    contexto: ContextoActual,
  ): Promise<{ id: ZonaId }> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    const id = comoZonaId(randomUUID());

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const lugar = await repositorioDeLugares.buscarPorId(tx, datos.lugarId);
      if (!lugar || lugar.bajaEn !== null || !puedeTenerZonas(lugar.tipo)) {
        throw new NoEncontradoError();
      }

      const repetida = await repositorio.buscarActivaPorNombre(tx, {
        lugarId: datos.lugarId,
        nombre: datos.nombre,
      });
      if (repetida) throw new NombreDeZonaDuplicadoError();

      await repositorio.crear(tx, {
        id,
        lugarId: datos.lugarId,
        nombre: datos.nombre,
        ayuntamientoId: contexto.ayuntamientoId,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "ALTA_ZONA",
        entidad: "zonas",
        entidadId: id,
      });
    });

    return { id };
  };
}
