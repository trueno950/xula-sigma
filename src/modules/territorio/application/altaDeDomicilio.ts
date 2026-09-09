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

const exigirCallesActivas = (
  callesBloqueadas: readonly CalleGuardada[],
): void => {
  if (callesBloqueadas.some(({ bajaEn }) => bajaEn !== null)) {
    throw new NoEncontradoError();
  }
};

type DependenciasDeAlta = {
  repositorio: RepositorioDeDomicilios;
  repositorioDeLugares: RepositorioDeLugares;
  repositorioDeCalles: RepositorioDeCalles;
};

type AltaPreparada = {
  id: DomicilioId;
  datos: NuevoDomicilio;
  numero: string | null;
  contexto: ContextoActual;
};

const validarEntrada = (
  datos: NuevoDomicilio,
  contexto: ContextoActual,
): void => {
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
};

const prepararAlta = (
  datos: NuevoDomicilio,
  contexto: ContextoActual,
): AltaPreparada => ({
  id: comoDomicilioId(randomUUID()),
  datos,
  numero: datos.numero?.trim() || null,
  contexto,
});

const verificarLugarYCalles = async (
  dependencias: DependenciasDeAlta,
  tx: Parameters<RepositorioDeCalles["bloquearPorId"]>[0],
  datos: NuevoDomicilio,
): Promise<void> => {
  const lugar = await dependencias.repositorioDeLugares.buscarPorId(
    tx,
    datos.lugarId,
  );
  if (!lugar) throw new NoEncontradoError();

  const callesBloqueadas = await bloquearCalles(
    dependencias.repositorioDeCalles,
    tx,
    idsDeCalles(datos),
  );
  exigirCallesActivas(callesBloqueadas);
};

const guardarDomicilio = async (
  dependencias: DependenciasDeAlta,
  alta: AltaPreparada,
): Promise<void> => {
  await withTenant(alta.contexto.ayuntamientoId, async (tx) => {
    await verificarLugarYCalles(dependencias, tx, alta.datos);

    await dependencias.repositorio.crear(tx, {
      id: alta.id,
      ayuntamientoId: alta.contexto.ayuntamientoId,
      lugarId: alta.datos.lugarId,
      calleId: alta.datos.calleId,
      numero: alta.numero,
      entreCalleAId: alta.datos.entreCalleAId,
      entreCalleBId: alta.datos.entreCalleBId,
      referencia: alta.datos.referencia,
    });

    await registrar(tx, {
      ayuntamientoId: alta.contexto.ayuntamientoId,
      actor: alta.contexto.usuario.id,
      origen: alta.contexto.origen,
      accion: "ALTA_DOMICILIO",
      entidad: "domicilios",
      entidadId: alta.id,
    });
  });
};

export function crearAltaDeDomicilio(
  repositorio: RepositorioDeDomicilios,
  repositorioDeLugares: RepositorioDeLugares,
  repositorioDeCalles: RepositorioDeCalles,
) {
  const dependencias = {
    repositorio,
    repositorioDeLugares,
    repositorioDeCalles,
  };

  return async function altaDeDomicilio(
    datos: NuevoDomicilio,
    contexto: ContextoActual,
  ): Promise<{ id: DomicilioId }> {
    validarEntrada(datos, contexto);
    const alta = prepararAlta(datos, contexto);

    await guardarDomicilio(dependencias, alta);

    return { id: alta.id };
  };
}
