import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type CalleId,
  ColoniaRequeridaError,
  comoDomicilioId,
  type DomicilioId,
  type LugarId,
  puedeTenerCatalogoDeCalles,
  TransversalRepetidaError,
  transversalesValidas,
  UbicacionIncoherenteError,
} from "../domain";
import type { RepositorioDeCalles, RepositorioDeLugares } from "./puertos";
import type { RepositorioDeDomicilios } from "./puertosDeDomicilios";
import { verificarZonaYCalles } from "./verificacionDeDomicilio";

export type NuevoDomicilio = {
  /** El nivel mas profundo conocido; sin el, el asentamiento de la calle. */
  lugarId?: LugarId | undefined;
  /** Los niveles de zona que el operador declaro. */
  nivelesDeclarados?: readonly LugarId[] | undefined;
  /** Confirma que el domicilio no pertenece a ninguna colonia. */
  sinColonia?: boolean | undefined;
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

const exigirDecisionDeColonia = async (
  dependencias: DependenciasDeAlta,
  destino: {
    tx: Parameters<RepositorioDeDomicilios["crear"]>[0];
    datos: NuevoDomicilio;
    lugarId: LugarId;
  },
): Promise<void> => {
  const lugar = await dependencias.repositorioDeLugares.buscarPorId(
    destino.tx,
    destino.lugarId,
  );
  if (!lugar) throw new NoEncontradoError();
  if (destino.datos.sinColonia && !puedeTenerCatalogoDeCalles(lugar.tipo)) {
    throw new UbicacionIncoherenteError();
  }
  if (!puedeTenerCatalogoDeCalles(lugar.tipo) || destino.datos.sinColonia) {
    return;
  }

  const lugares = await dependencias.repositorioDeLugares.listarLugares(
    destino.tx,
  );
  if (
    lugares.some((hijo) => hijo.tipo === "colonia" && hijo.padreId === lugar.id)
  ) {
    throw new ColoniaRequeridaError();
  }
};

const guardarDomicilio = async (
  dependencias: DependenciasDeAlta,
  alta: AltaPreparada,
): Promise<void> => {
  await withTenant(alta.contexto.ayuntamientoId, async (tx) => {
    const lugarId = await verificarZonaYCalles(dependencias, tx, alta.datos);
    await exigirDecisionDeColonia(dependencias, {
      tx,
      datos: alta.datos,
      lugarId,
    });

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
