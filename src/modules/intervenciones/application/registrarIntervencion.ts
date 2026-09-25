import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { publicarActualizacion } from "@/shared/notificaciones/notificar";
import { registrar } from "@/shared/tenancy/bitacora";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import {
  comoIntervencionId,
  type IntervencionId,
  type TipoDeIntervencion,
} from "../domain";
import type { RepositorioDeIntervenciones } from "./puertos";
import type {
  LecturaDeReportes,
  LecturaDeUbicaciones,
} from "./puertosDeLectura";

export type EntradaDeRegistroDeIntervencion = {
  tipo: TipoDeIntervencion;
  fechaDeOcurrencia: string;
  lugarId: string;
  calleId: string | null;
  reporteId: string | null;
  descripcion: string;
};

type SolicitudDeRegistroEnTenant = {
  tx: TransaccionTenant;
  datos: EntradaDeRegistroDeIntervencion;
  contexto: ContextoActual;
  repositorio: Pick<RepositorioDeIntervenciones, "guardar">;
  crearLecturaDeUbicaciones: () => LecturaDeUbicaciones;
  crearLecturaDeReportes: () => LecturaDeReportes;
};

const validarReferenciasDeRegistro = async (
  solicitud: SolicitudDeRegistroEnTenant,
): Promise<void> => {
  const ubicacion = await solicitud
    .crearLecturaDeUbicaciones()
    .de(solicitud.tx, solicitud.datos.lugarId, solicitud.datos.calleId);
  if (!ubicacion) throw new NoEncontradoError();

  if (
    solicitud.datos.reporteId !== null &&
    !(await solicitud
      .crearLecturaDeReportes()
      .porId(solicitud.tx, solicitud.datos.reporteId))
  ) {
    throw new NoEncontradoError();
  }
};

const registrarIntervencionEnTenant = async (
  solicitud: SolicitudDeRegistroEnTenant,
): Promise<IntervencionId> => {
  const { tx, datos, contexto, repositorio } = solicitud;
  await validarReferenciasDeRegistro(solicitud);
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

  await publicarActualizacion(tx, contexto.ayuntamientoId, {
    tipo: "intervencion",
    id,
    cambio: "alta",
  });
  return id;
};

export function crearRegistrarIntervencion({
  repositorio,
  crearLecturaDeUbicaciones,
  crearLecturaDeReportes,
}: {
  repositorio: Pick<RepositorioDeIntervenciones, "guardar">;
  crearLecturaDeUbicaciones: () => LecturaDeUbicaciones;
  crearLecturaDeReportes: () => LecturaDeReportes;
}) {
  return async function registrarIntervencion(
    datos: EntradaDeRegistroDeIntervencion,
    contexto: ContextoActual,
  ): Promise<IntervencionId> {
    if (!puedeEscribir(contexto.usuario.rol)) throw new NoAutorizadoError();

    return withTenant(contexto.ayuntamientoId, (tx) =>
      registrarIntervencionEnTenant({
        tx,
        datos,
        contexto,
        repositorio,
        crearLecturaDeUbicaciones,
        crearLecturaDeReportes,
      }),
    );
  };
}
