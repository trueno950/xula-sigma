import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import { DomicilioConResidentesError, type DomicilioId } from "../domain";
import type { RepositorioDeDomicilios } from "./puertosDeDomicilios";
import type { RepositorioDeResidencias } from "./puertosDeResidencias";

/**
 * Baja logica de una direccion: `puedeEscribir`, trabajo de mostrador. Si
 * hay una residencia vigente se rechaza con un error tipado -la direccion
 * de una persona no se da de baja por debajo de ella- y en ningun caso se
 * toca una fila de `residencias`: la baja solo escribe `bajaEn`.
 *
 * Bloquea la fila antes de escribir -mismo patron que `darDeBajaCalle`- y
 * una segunda baja es 404.
 */
export function crearDarDeBajaDomicilio(
  repositorio: RepositorioDeDomicilios,
  repositorioDeResidencias: RepositorioDeResidencias,
) {
  return async function darDeBajaDomicilio(
    id: DomicilioId,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeEscribir(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const existente = await repositorio.bloquearPorId(tx, id);
      if (!existente || existente.bajaEn !== null) {
        throw new NoEncontradoError();
      }

      const residentes = await repositorioDeResidencias.residentesDe(tx, [id]);
      if (residentes.length > 0) throw new DomicilioConResidentesError();

      const actualizado = await repositorio.actualizar(tx, {
        id,
        lugarId: existente.lugarId,
        calleId: existente.calleId,
        numero: existente.numero,
        entreCalleAId: existente.entreCalleAId,
        entreCalleBId: existente.entreCalleBId,
        referencia: existente.referencia,
        bajaEn: new Date(),
      });
      if (!actualizado) throw new NoEncontradoError();

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "BAJA_DOMICILIO",
        entidad: "domicilios",
        entidadId: id,
      });
    });
  };
}
