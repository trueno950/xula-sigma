import { z } from "zod";
import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeAdministrarIntervenciones } from "@/shared/auth/roles";
import {
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { publicarActualizacion } from "@/shared/notificaciones/notificar";
import { registrar } from "@/shared/tenancy/bitacora";
import {
  type TransaccionTenant,
  withTenant,
} from "@/shared/tenancy/withTenant";
import { comoIntervencionId, TIPOS_DE_INTERVENCION } from "../domain";
import type { RepositorioDeIntervenciones } from "./puertos";
import type {
  LecturaDeReportes,
  LecturaDeUbicaciones,
} from "./puertosDeLectura";

const esquemaDeEntrada = z.strictObject({
  id: z.string().trim().uuid(),
  tipo: z.enum(TIPOS_DE_INTERVENCION),
  fechaDeOcurrencia: z.iso.date(),
  lugarId: z.string().trim().uuid(),
  calleId: z.string().trim().uuid().nullable(),
  reporteId: z.string().trim().uuid().nullable(),
  descripcion: z.string().trim().min(10).max(1000),
});

export type EntradaDeCorreccionDeIntervencion = z.infer<
  typeof esquemaDeEntrada
>;

type RegistrarDeBitacora = (...args: Parameters<typeof registrar>) => unknown;

type SolicitudDeCorreccionEnTenant = {
  entrada: EntradaDeCorreccionDeIntervencion;
  id: string;
  cambios: Omit<EntradaDeCorreccionDeIntervencion, "id">;
  contexto: ContextoActual;
  repositorio: Pick<RepositorioDeIntervenciones, "corregir">;
  crearLecturaDeUbicaciones: () => LecturaDeUbicaciones;
  crearLecturaDeReportes: () => LecturaDeReportes;
  registrarBitacora: RegistrarDeBitacora;
};

const validarEntrada = (datos: unknown): EntradaDeCorreccionDeIntervencion => {
  const resultado = esquemaDeEntrada.safeParse(datos);
  if (resultado.success) return resultado.data;

  throw new ValidacionError();
};

const validarReferenciasDeCorreccion = async (
  tx: TransaccionTenant,
  solicitud: SolicitudDeCorreccionEnTenant,
): Promise<void> => {
  const ubicacion = await solicitud
    .crearLecturaDeUbicaciones()
    .de(tx, solicitud.entrada.lugarId, solicitud.entrada.calleId);
  if (!ubicacion) throw new NoEncontradoError();

  if (
    solicitud.entrada.reporteId !== null &&
    !(await solicitud
      .crearLecturaDeReportes()
      .porId(tx, solicitud.entrada.reporteId))
  ) {
    throw new NoEncontradoError();
  }
};

const corregirIntervencionEnTenant = async (
  tx: TransaccionTenant,
  solicitud: SolicitudDeCorreccionEnTenant,
): Promise<void> => {
  const { contexto, repositorio, registrarBitacora } = solicitud;
  await validarReferenciasDeCorreccion(tx, solicitud);
  const corregida = await repositorio.corregir(tx, {
    id: comoIntervencionId(solicitud.id),
    ayuntamientoId: contexto.ayuntamientoId,
    usuarioId: contexto.usuario.id,
    cambios: solicitud.cambios,
  });
  if (!corregida) throw new NoEncontradoError();

  await registrarBitacora(tx, {
    ayuntamientoId: contexto.ayuntamientoId,
    actor: contexto.usuario.id,
    origen: contexto.origen,
    accion: "CORREGIR_INTERVENCION",
    entidad: "intervenciones",
    entidadId: solicitud.id,
  });

  await publicarActualizacion(tx, contexto.ayuntamientoId, {
    tipo: "intervencion",
    id: solicitud.id,
    cambio: "correccion",
  });
};

export function crearCorregirIntervencion({
  repositorio,
  crearLecturaDeUbicaciones,
  crearLecturaDeReportes,
  registrarBitacora = registrar,
}: {
  repositorio: Pick<RepositorioDeIntervenciones, "corregir">;
  crearLecturaDeUbicaciones: () => LecturaDeUbicaciones;
  crearLecturaDeReportes: () => LecturaDeReportes;
  registrarBitacora?: RegistrarDeBitacora;
}) {
  return async function corregirIntervencion(
    datos: unknown,
    contexto: ContextoActual,
  ) {
    if (!puedeAdministrarIntervenciones(contexto.usuario.rol)) {
      throw new NoAutorizadoError();
    }

    const entrada = validarEntrada(datos);
    const { id, ...cambios } = entrada;
    const solicitud: SolicitudDeCorreccionEnTenant = {
      entrada,
      id,
      cambios,
      contexto,
      repositorio,
      crearLecturaDeUbicaciones,
      crearLecturaDeReportes,
      registrarBitacora,
    };

    await withTenant(contexto.ayuntamientoId, (tx) =>
      corregirIntervencionEnTenant(tx, solicitud),
    );
  };
}
