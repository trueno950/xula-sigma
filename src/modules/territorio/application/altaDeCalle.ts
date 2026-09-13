import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import { type CalleId, comoCalleId, type LugarId } from "../domain";
import type { RepositorioDeCalles, RepositorioDeLugares } from "./puertos";

export type NuevaCalle = {
  nombre: string;
  lugarId: LugarId;
};

/**
 * Alta de una calle en el catalogo de un lugar. `puedeAdministrarTerritorio`
 * (tasks.md 4.2): el catalogo de calles es estructura territorial, no
 * trabajo de mostrador.
 *
 * Lee `lugarId` bajo RLS con `repositorioDeLugares.buscarPorId` antes de
 * insertar -mismo precedente que `altaDeLugar.ts` con `padreId`: sin esto,
 * un `lugarId` de otro tenant o inexistente llegaba crudo al FK compuesto
 * de Postgres en vez de un `NoEncontradoError` limpio.
 *
 * Puede lanzar `NombreDeCalleDuplicadoError`; el porque esta en
 * `domain/errores.ts`.
 */
export function crearAltaDeCalle(
  repositorio: RepositorioDeCalles,
  repositorioDeLugares: RepositorioDeLugares,
) {
  return async function altaDeCalle(
    datos: NuevaCalle,
    contexto: ContextoActual,
  ): Promise<{ id: CalleId }> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    const id = comoCalleId(randomUUID());

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const lugar = await repositorioDeLugares.buscarPorId(tx, datos.lugarId);
      if (!lugar) throw new NoEncontradoError();

      await repositorio.crear(tx, {
        id,
        ayuntamientoId: contexto.ayuntamientoId,
        nombre: datos.nombre,
        lugarId: datos.lugarId,
      });

      await repositorio.registrarEventoDeAlta(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        calleId: id,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "ALTA_CALLE",
        entidad: "calles",
        entidadId: id,
      });
    });

    return { id };
  };
}
