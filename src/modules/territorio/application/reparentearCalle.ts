import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import type { CalleId, LugarId } from "../domain";
import type { RepositorioDeCalles, RepositorioDeLugares } from "./puertos";

export function crearReparentearCalle(
  repositorio: RepositorioDeCalles,
  repositorioDeLugares: RepositorioDeLugares,
) {
  return async function reparentearCalle(
    id: CalleId,
    nuevoLugarId: LugarId,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const existente = await repositorio.bloquearPorId(tx, id);
      if (!existente || existente.bajaEn !== null) {
        throw new NoEncontradoError();
      }

      const destino = await repositorioDeLugares.buscarPorId(tx, nuevoLugarId);
      if (!destino) throw new NoEncontradoError();

      const actualizada = await repositorio.actualizar(tx, {
        id,
        nombre: existente.nombre,
        lugarId: destino.id,
        punto: existente.punto,
        bajaEn: existente.bajaEn,
      });
      if (!actualizada) throw new NoEncontradoError();

      await repositorio.registrarEventoDeReparenteo(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        calleId: id,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "REPARENTEAR_CALLE",
        entidad: "calles",
        entidadId: id,
      });
    });
  };
}
