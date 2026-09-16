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
import { cadenaHastaAsentamiento } from "./asentamientoDeLugar";
import type { RepositorioDeCalles, RepositorioDeLugares } from "./puertos";
import type { RepositorioDeDomicilios } from "./puertosDeDomicilios";
import {
  bloquearCalles,
  exigirCallesActivas,
  exigirCallesDelAsentamiento,
  exigirNivelesDeclarados,
  idsDeCalles,
} from "./verificacionDeDomicilio";

export type NuevoDomicilio = {
  /** El nivel mas profundo conocido; sin el, el asentamiento de la calle. */
  lugarId?: LugarId | undefined;
  /** Los niveles de zona que el operador declaro. */
  nivelesDeclarados?: readonly LugarId[] | undefined;
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
): Promise<LugarId> => {
  const callesBloqueadas = await bloquearCalles(
    dependencias.repositorioDeCalles,
    tx,
    idsDeCalles(datos.calleId, datos.entreCalleAId, datos.entreCalleBId),
  );
  exigirCallesActivas(callesBloqueadas);

  // Sin nivel declarado el asentamiento sale de la calle: las calles
  // cuelgan de un asentamiento, y es la unica parte de la zona que el
  // operador ya eligio.
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

const guardarDomicilio = async (
  dependencias: DependenciasDeAlta,
  alta: AltaPreparada,
): Promise<void> => {
  await withTenant(alta.contexto.ayuntamientoId, async (tx) => {
    const lugarId = await verificarLugarYCalles(dependencias, tx, alta.datos);

    await dependencias.repositorio.crear(tx, {
      id: alta.id,
      ayuntamientoId: alta.contexto.ayuntamientoId,
      lugarId,
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
