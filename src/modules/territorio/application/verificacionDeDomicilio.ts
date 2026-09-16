import { NoEncontradoError } from "@/shared/lib/errores";
import { type CalleId, type LugarId, ZonaIncoherenteError } from "../domain";
import type {
  CalleGuardada,
  LugarGuardado,
  RepositorioDeCalles,
} from "./puertos";

/** Los ids distintos de las tres calles del domicilio, en orden estable. */
export const idsDeCalles = (
  calleId: CalleId,
  entreCalleAId: CalleId | null,
  entreCalleBId: CalleId | null,
): CalleId[] =>
  [calleId, entreCalleAId, entreCalleBId]
    .filter((id): id is CalleId => id !== null)
    .filter((id, indice, ids) => ids.indexOf(id) === indice)
    .sort();

export const bloquearCalles = async (
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

export const exigirCallesActivas = (
  callesBloqueadas: readonly CalleGuardada[],
): void => {
  if (callesBloqueadas.some(({ bajaEn }) => bajaEn !== null)) {
    throw new NoEncontradoError();
  }
};

/**
 * Las tres calles salen del mismo asentamiento. La incoherencia es un dato
 * visible para el tenant -las dos filas estan a la vista- y por eso es
 * `ZonaIncoherenteError` y no un 404.
 */
export const exigirCallesDelAsentamiento = (
  callesBloqueadas: readonly CalleGuardada[],
  asentamientoId: LugarId,
): void => {
  if (callesBloqueadas.some(({ lugarId }) => lugarId !== asentamientoId)) {
    throw new ZonaIncoherenteError();
  }
};

export const exigirNivelesDeclarados = (
  declarados: readonly LugarId[],
  cadena: readonly LugarGuardado[],
): void => {
  if (declarados.some((id) => !cadena.some((eslabon) => eslabon.id === id))) {
    throw new ZonaIncoherenteError();
  }
};
