import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { registrar } from "@/shared/tenancy/bitacora";
import { withTenant } from "@/shared/tenancy/withTenant";
import {
  comoIntervencionId,
  type IntervencionId,
  type TipoDeIntervencion,
} from "../domain";
import type { RepositorioDeIntervenciones } from "./puertos";
import type { LecturaDeUbicaciones } from "./puertosDeLectura";

export type EntradaDeRegistroDeIntervencion = {
  tipo: TipoDeIntervencion;
  fechaDeOcurrencia: string;
  lugarId: string;
  calleId: string | null;
  reporteId: string | null;
  descripcion: string;
};

export function crearRegistrarIntervencion({
  repositorio,
  crearLecturaDeUbicaciones,
}: {
  repositorio: Pick<RepositorioDeIntervenciones, "guardar">;
  crearLecturaDeUbicaciones: () => LecturaDeUbicaciones;
}) {
  return async function registrarIntervencion(
    datos: EntradaDeRegistroDeIntervencion,
    contexto: ContextoActual,
  ): Promise<IntervencionId> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    return withTenant(contexto.ayuntamientoId, async (tx) => {
      const ubicacion = await crearLecturaDeUbicaciones().de(
        tx,
        datos.lugarId,
        datos.calleId,
      );
      if (!ubicacion) throw new NoEncontradoError();

      const id = comoIntervencionId(randomUUID());

      await repositorio.guardar(tx, {
        id,
        ayuntamientoId: contexto.ayuntamientoId,
        tipo: datos.tipo,
        estado: "PLANIFICADA",
        fechaDeOcurrencia: datos.fechaDeOcurrencia,
        lugarId: datos.lugarId,
        calleId: datos.calleId,
        reporteId: datos.reporteId,
        descripcion: datos.descripcion,
        registradoPorUsuarioId: contexto.usuario.id,
      });

      await registrar(tx, {
        ayuntamientoId: contexto.ayuntamientoId,
        actor: contexto.usuario.id,
        origen: contexto.origen,
        accion: "REGISTRAR_INTERVENCION",
        entidad: "intervenciones",
        entidadId: id,
      });

      return id;
    });
  };
}
