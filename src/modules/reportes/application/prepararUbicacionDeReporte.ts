import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import { UbicacionInvalidaError } from "../domain";
import type { LecturaDeDomicilios } from "./puertosDeDomicilios";
import type { LecturaDeUbicaciones } from "./puertosDeLectura";

export type DatosDeUbicacionDeReporte = {
  domicilioId?: string | null | undefined;
  lugarId?: string | undefined;
  calleId?: string | null | undefined;
};

export type UbicacionPreparada = {
  domicilioId: string | null;
  lugarId: string;
  calleId: string | null;
};

type DependenciasDeUbicacion = {
  datos: DatosDeUbicacionDeReporte;
  contexto: ContextoActual;
  crearLecturaDeUbicaciones: (contexto: ContextoActual) => LecturaDeUbicaciones;
  crearLecturaDeDomicilios?:
    | ((contexto: ContextoActual) => LecturaDeDomicilios)
    | undefined;
};

const resolverDomicilio = async ({
  datos,
  contexto,
  crearLecturaDeDomicilios,
}: DependenciasDeUbicacion): Promise<{
  lugarId: string;
  calleId: string;
} | null> => {
  if (datos.domicilioId === undefined || datos.domicilioId === null)
    return null;

  const lector = crearLecturaDeDomicilios?.(contexto);
  const domicilio = lector ? await lector.porId(datos.domicilioId) : null;
  if (!domicilio) throw new NoEncontradoError();
  if (datos.lugarId !== undefined && datos.lugarId !== domicilio.lugarId) {
    throw new UbicacionInvalidaError();
  }
  if (datos.calleId !== undefined && datos.calleId !== domicilio.calleId) {
    throw new UbicacionInvalidaError();
  }

  return domicilio;
};

/** Resuelve la dirección enlazada antes del contador o valida la ruta pública. */
export async function prepararUbicacionDeReporte(
  dependencias: DependenciasDeUbicacion,
): Promise<UbicacionPreparada> {
  const domicilio = await resolverDomicilio(dependencias);
  const lugarId = domicilio?.lugarId ?? dependencias.datos.lugarId;
  if (!lugarId) throw new UbicacionInvalidaError();

  const calleId = domicilio?.calleId ?? dependencias.datos.calleId ?? null;
  const ubicacion = await dependencias
    .crearLecturaDeUbicaciones(dependencias.contexto)
    .de(lugarId, calleId);
  if (!ubicacion) {
    if (domicilio) throw new NoEncontradoError();
    throw new UbicacionInvalidaError();
  }

  return {
    domicilioId: domicilio ? (dependencias.datos.domicilioId ?? null) : null,
    lugarId,
    calleId,
  };
}
