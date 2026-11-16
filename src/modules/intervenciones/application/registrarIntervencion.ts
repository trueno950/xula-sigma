import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import {
  comoIntervencionId,
  type IntervencionId,
  type TipoDeIntervencion,
} from "../domain";
import { guardarIntervencionEnTransaccion } from "./altaDeIntervencion";
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

  return guardarIntervencionEnTransaccion({
    tx,
    contexto,
    repositorio,
    accion: "REGISTRAR_INTERVENCION",
    datos: {
      id: comoIntervencionId(randomUUID()),
      ayuntamientoId: contexto.ayuntamientoId,
      tipo: datos.tipo,
      estado: "PLANIFICADA",
      fechaDeOcurrencia: datos.fechaDeOcurrencia,
      lugarId: datos.lugarId,
      calleId: datos.calleId,
      reporteId: datos.reporteId,
      descripcion: datos.descripcion,
      registradoPorUsuarioId: contexto.usuario.id,
    },
  });
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
