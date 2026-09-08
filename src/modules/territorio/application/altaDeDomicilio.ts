import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type CalleId,
  comoDomicilioId,
  type DomicilioId,
  type LugarId,
  TransversalRepetidaError,
  transversalesValidas,
} from "../domain";
import type {
  CalleGuardada,
  RepositorioDeCalles,
  RepositorioDeLugares,
} from "./puertos";
import type { RepositorioDeDomicilios } from "./puertosDeDomicilios";

export type NuevoDomicilio = {
  lugarId: LugarId;
  calleId: CalleId;
  numero: string | null;
  entreCalleAId: CalleId | null;
  entreCalleBId: CalleId | null;
  referencia: string | null;
};

/**
 * Alta de un domicilio. `puedeEscribir` (design.md seccion 12): a
 * diferencia de `altaDeCalle`, esto es trabajo de mostrador -capturar la
 * direccion de una casa- no reestructuracion territorial.
 *
 * Lee `lugarId` bajo RLS y bloquea todas las calles referenciadas antes de
 * insertar. El orden estable de esos locks evita deadlocks cuando dos altas
 * comparten transversales; el lock tambien cierra la carrera con la baja de
 * una calle.
 */

const idsDeCalles = (datos: NuevoDomicilio): CalleId[] =>
  [datos.calleId, datos.entreCalleAId, datos.entreCalleBId]
    .filter((id): id is CalleId => id !== null)
    .filter((id, indice, ids) => ids.indexOf(id) === indice)
    .sort();

const bloquearCalles = async (
  repositorio: RepositorioDeCalles,
  tx: Parameters<RepositorioDeCalles["bloquearPorId"]>[0],
  ids: readonly CalleId[],
): Promise<readonly CalleGuardada[]> => {
  const bloqueadas: CalleGuardada[] = [];

  for (const id of ids) {
    const calle = await repositorio.bloquearPorId(tx, id);
    if (!calle) throw new NoEncontradoError();
    bloqueadas.push(calle);
  }

  return bloqueadas;
};

export function crearAltaDeDomicilio(
  repositorio: RepositorioDeDomicilios,
  repositorioDeLugares: RepositorioDeLugares,
  repositorioDeCalles: RepositorioDeCalles,
) {
  return async function altaDeDomicilio(
    datos: NuevoDomicilio,
    contexto: ContextoActual,
  ): Promise<{ id: DomicilioId }> {
    if (!puedeEscribir(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    if (
      !transversalesValidas(
        datos.calleId,
        datos.entreCalleAId,
        datos.entreCalleBId,
      )
    ) {
      throw new TransversalRepetidaError();
    }

    const id = comoDomicilioId(randomUUID());
    const numero = datos.numero?.trim() || null;

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const lugar = await repositorioDeLugares.buscarPorId(tx, datos.lugarId);
      if (!lugar) throw new NoEncontradoError();

      const callesBloqueadas = await bloquearCalles(
        repositorioDeCalles,
        tx,
        idsDeCalles(datos),
      );
      const calle = callesBloqueadas.find(({ id }) => id === datos.calleId);
      if (!calle || calle.bajaEn !== null) throw new NoEncontradoError();

      await repositorio.crear(tx, {
        id,
        ayuntamientoId: contexto.ayuntamientoId,
        lugarId: datos.lugarId,
        calleId: datos.calleId,
        numero,
        entreCalleAId: datos.entreCalleAId,
        entreCalleBId: datos.entreCalleBId,
        referencia: datos.referencia,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "ALTA_DOMICILIO",
        entidad: "domicilios",
        entidadId: id,
      });
    });

    return { id };
  };
}
