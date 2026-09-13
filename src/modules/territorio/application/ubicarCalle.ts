import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarTerritorio } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { publicarActualizacion } from "@/shared/notificaciones/notificar";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  type CalleId,
  estaEnYucatan,
  PuntoFueraDeYucatanError,
  type PuntoGeografico,
  redondearPunto,
} from "../domain";
import type { RepositorioDeCalles } from "./puertos";

export function crearUbicarCalle(repositorio: RepositorioDeCalles) {
  return async function ubicarCalle(
    id: CalleId,
    punto: PuntoGeografico | null,
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeAdministrarTerritorio(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    const puntoGuardado = punto && validarPunto(punto);

    await withTenant(contexto.ayuntamientoId, async (tx) => {
      const existente = await repositorio.bloquearPorId(tx, id);
      if (!existente || existente.bajaEn !== null) {
        throw new NoEncontradoError();
      }

      const actualizada = await repositorio.actualizar(tx, {
        id,
        nombre: existente.nombre,
        lugarId: existente.lugarId,
        punto: puntoGuardado,
        bajaEn: existente.bajaEn,
      });
      if (!actualizada) throw new NoEncontradoError();

      await repositorio.registrarEventoDeUbicacion(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        calleId: id,
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
        accion: "UBICAR_CALLE",
        entidad: "calles",
        entidadId: id,
      });
    });
  };
}

const validarPunto = (punto: PuntoGeografico): PuntoGeografico => {
  if (!estaEnYucatan(punto)) throw new PuntoFueraDeYucatanError();

  return redondearPunto(punto);
};
