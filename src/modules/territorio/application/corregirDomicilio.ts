import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type CalleId,
  type DomicilioId,
  type LugarId,
  TransversalRepetidaError,
  transversalesValidas,
} from "../domain";
import type { RepositorioDeCalles, RepositorioDeLugares } from "./puertos";
import type { RepositorioDeDomicilios } from "./puertosDeDomicilios";
import { verificarZonaYCalles } from "./verificacionDeDomicilio";

export type CorreccionDeDomicilio = {
  id: DomicilioId;
  /** El nivel mas profundo conocido; sin el, el asentamiento de la calle. */
  lugarId?: LugarId | undefined;
  nivelesDeclarados?: readonly LugarId[] | undefined;
  calleId: CalleId;
  numero: string | null;
  entreCalleAId: CalleId | null;
  entreCalleBId: CalleId | null;
  referencia: string | null;
};

/**
 * Corrige una direccion existente: `puedeEscribir`, trabajo de mostrador
 * (design.md seccion 12), igual que el alta. Revalida todo lo que el alta
 * valida usando el mismo camino (`verificarZonaYCalles`): una direccion no
 * puede quedar en un estado que el alta nunca habria aceptado.
 *
 * Bloquea la fila antes de escribir -mismo patron que `darDeBajaCalle`- y
 * responde 404 tanto para otro tenant como para una direccion ya dada de
 * baja.
 */
export function crearCorregirDomicilio(
  repositorio: RepositorioDeDomicilios,
  repositorioDeLugares: RepositorioDeLugares,
  repositorioDeCalles: RepositorioDeCalles,
) {
  const dependencias = { repositorioDeLugares, repositorioDeCalles };

  return async function corregirDomicilio(
    datos: CorreccionDeDomicilio,
    contexto: ContextoActual,
  ): Promise<void> {
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

    const numero = datos.numero?.trim() || null;

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const existente = await repositorio.bloquearPorId(tx, datos.id);
      if (!existente || existente.bajaEn !== null) {
        throw new NoEncontradoError();
      }

      const lugarId = await verificarZonaYCalles(dependencias, tx, datos);

      const actualizado = await repositorio.actualizar(tx, {
        id: datos.id,
        lugarId,
        calleId: datos.calleId,
        numero,
        entreCalleAId: datos.entreCalleAId,
        entreCalleBId: datos.entreCalleBId,
        referencia: datos.referencia,
        bajaEn: existente.bajaEn,
      });
      if (!actualizado) throw new NoEncontradoError();

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "CORREGIR_DOMICILIO",
        entidad: "domicilios",
        entidadId: datos.id,
      });
    });
  };
}
