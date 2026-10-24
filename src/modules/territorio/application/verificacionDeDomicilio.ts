import { NoEncontradoError } from "@/shared/lib/errores";
import {
  type CalleId,
  type LugarId,
  UbicacionIncoherenteError,
} from "../domain";
import { cadenaHastaAsentamiento } from "./asentamientoDeLugar";
import type {
  CalleGuardada,
  LugarGuardado,
  RepositorioDeCalles,
  RepositorioDeLugares,
} from "./puertos";

type Transaccion = Parameters<RepositorioDeCalles["bloquearPorId"]>[0];

/** Los ids distintos de las tres calles del domicilio, en orden estable. */
const idsDeCalles = (
  calleId: CalleId,
  entreCalleAId: CalleId | null,
  entreCalleBId: CalleId | null,
): CalleId[] =>
  [calleId, entreCalleAId, entreCalleBId]
    .filter((id): id is CalleId => id !== null)
    .filter((id, indice, ids) => ids.indexOf(id) === indice)
    .sort();

const bloquearCalles = async (
  repositorio: RepositorioDeCalles,
  tx: Transaccion,
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

/**
 * Las tres calles salen del mismo asentamiento. La incoherencia es un dato
 * visible para el tenant -las dos filas estan a la vista- y por eso es
 * `UbicacionIncoherenteError` y no un 404.
 */
const exigirCallesDelAsentamiento = (
  callesBloqueadas: readonly CalleGuardada[],
  asentamientoId: LugarId,
): void => {
  if (callesBloqueadas.some(({ lugarId }) => lugarId !== asentamientoId)) {
    throw new UbicacionIncoherenteError();
  }
};

const exigirNivelesDeclarados = (
  declarados: readonly LugarId[],
  cadena: readonly LugarGuardado[],
): void => {
  if (declarados.some((id) => !cadena.some((eslabon) => eslabon.id === id))) {
    throw new UbicacionIncoherenteError();
  }
};

export type DatosDeZonaYCalles = {
  lugarId?: LugarId | undefined;
  nivelesDeclarados?: readonly LugarId[] | undefined;
  calleId: CalleId;
  entreCalleAId: CalleId | null;
  entreCalleBId: CalleId | null;
};

type DependenciasDeVerificacion = {
  repositorioDeLugares: RepositorioDeLugares;
  repositorioDeCalles: RepositorioDeCalles;
};

/**
 * Bloquea las tres calles y valida la zona completa -lugar, cadena y
 * calles del asentamiento contenedor- antes de escribir. Devuelve el lugar
 * resuelto: sin nivel declarado sale de la calle, que es la unica parte de
 * la zona que quien captura ya eligio. Lo comparten el alta y la
 * correccion, para que una direccion no pueda quedar en un estado que el
 * alta nunca habria aceptado.
 */
export const verificarZonaYCalles = async (
  dependencias: DependenciasDeVerificacion,
  tx: Transaccion,
  datos: DatosDeZonaYCalles,
): Promise<LugarId> => {
  const callesBloqueadas = await bloquearCalles(
    dependencias.repositorioDeCalles,
    tx,
    idsDeCalles(datos.calleId, datos.entreCalleAId, datos.entreCalleBId),
  );
  exigirCallesActivas(callesBloqueadas);

  const callePrincipal = callesBloqueadas.find(
    (calle) => calle.id === datos.calleId,
  );
  const lugarId = datos.lugarId ?? callePrincipal?.lugarId;
  if (!lugarId) throw new NoEncontradoError();

  const lugar = await dependencias.repositorioDeLugares.buscarPorId(
    tx,
    lugarId,
  );
  if (!lugar) throw new NoEncontradoError();

  const cadena = await cadenaHastaAsentamiento(
    dependencias.repositorioDeLugares,
    tx,
    lugar,
  );
  const asentamiento = cadena[cadena.length - 1];
  if (!asentamiento) throw new NoEncontradoError();

  exigirNivelesDeclarados(datos.nivelesDeclarados ?? [], cadena);
  exigirCallesDelAsentamiento(callesBloqueadas, asentamiento.id);

  return lugarId;
};
