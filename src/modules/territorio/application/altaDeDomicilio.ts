import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError } from "@/shared/lib/errores";
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
import type { RepositorioDeDomicilios } from "./puertos";

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
 */
export function crearAltaDeDomicilio(repositorio: RepositorioDeDomicilios) {
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
