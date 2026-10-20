import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { publicarActualizacion } from "@/shared/notificaciones/notificar";
import { registrar } from "@/shared/tenancy/bitacora";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  CalleConDomiciliosError,
  CalleEnZonaError,
  type CalleId,
  CatalogoDeCallesSoloEnAsentamientosError,
  type LugarId,
  puedeTenerCatalogoDeCalles,
} from "../domain";
import type {
  CalleGuardada,
  RepositorioDeCalles,
  RepositorioDeLugares,
} from "./puertos";

type DatosDeDestino = {
  repositorio: RepositorioDeCalles;
  repositorioDeLugares: RepositorioDeLugares;
  tx: TransaccionTenant;
  existente: CalleGuardada;
  nuevoLugarId: LugarId;
};

/**
 * Valida el destino y, si de verdad cambia de asentamiento, que la calle no
 * tenga domicilios colgados -esos domicilios se quedarian con el lugarId
 * viejo, apuntando a una calle que ya vive en otro lugar.
 */
async function exigirDestinoValido({
  repositorio,
  repositorioDeLugares,
  tx,
  existente,
  nuevoLugarId,
}: DatosDeDestino) {
  const destino = await repositorioDeLugares.buscarPorId(tx, nuevoLugarId);
  if (!destino) throw new NoEncontradoError();
  if (!puedeTenerCatalogoDeCalles(destino.tipo)) {
    throw new CatalogoDeCallesSoloEnAsentamientosError();
  }

  if (destino.id !== existente.lugarId) {
    const domicilios = await repositorio.contarDomiciliosQueLaUsan(
      tx,
      existente.id,
    );
    if (domicilios > 0) {
      throw new CalleConDomiciliosError(
        "La calle tiene domicilios y no se puede mover a otro asentamiento.",
      );
    }

    const zonas = await repositorio.contarZonasQueLaUsan(tx, existente.id);
    if (zonas > 0) throw new CalleEnZonaError();
  }

  return destino;
}

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

      const destino = await exigirDestinoValido({
        repositorio,
        repositorioDeLugares,
        tx,
        existente,
        nuevoLugarId,
      });

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
        lugarAnteriorId: existente.lugarId,
        lugarNuevoId: destino.id,
      });

      await publicarActualizacion(tx, contexto.ayuntamientoId, {
        tipo: "calle",
        id,
        cambio: "estructura",
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
