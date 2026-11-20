import { randomUUID } from "node:crypto";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeEscribir } from "@/shared/auth/roles";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import {
  CalleFueraDelLugarError,
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
  await exigirUbicacion(
    solicitud.crearLecturaDeUbicaciones(),
    solicitud.tx,
    solicitud.datos,
  );

  if (
    solicitud.datos.reporteId !== null &&
    !(await solicitud
      .crearLecturaDeReportes()
      .porId(solicitud.tx, solicitud.datos.reporteId))
  ) {
    throw new NoEncontradoError();
  }
};

/**
 * La pareja lugar/calle tiene que resolver, y la calle tiene que colgar del
 * asentamiento de ese lugar (S6 de `intervenciones-ux`). Son dos preguntas:
 * `de` dice si las filas existen y estan a la vista, `calleDelLugar` si la
 * calle es del lugar. La segunda solo se hace con una calle pedida: una obra
 * puede registrarse solo por lugar.
 */
const exigirUbicacion = async (
  lector: LecturaDeUbicaciones,
  tx: TransaccionTenant,
  datos: { lugarId: string; calleId: string | null },
): Promise<void> => {
  const ubicacion = await lector.de(tx, datos.lugarId, datos.calleId);
  if (!ubicacion) throw new NoEncontradoError();
  if (datos.calleId === null) return;

  const calle = await lector.calleDelLugar?.(tx, datos.lugarId, datos.calleId);
  if (calle === "del-lugar") return;

  throw calle === "fuera-del-lugar"
    ? new CalleFueraDelLugarError()
    : new NoEncontradoError();
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
