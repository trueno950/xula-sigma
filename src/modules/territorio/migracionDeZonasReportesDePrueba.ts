import type { CalleId, LugarId } from "./domain";
import { comoCalleId, comoLugarId } from "./domain";

export const esRegistro = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

const extraerJsonDeNotice = (salida: string, marcador: string): unknown[] => {
  const inicio = salida.lastIndexOf(marcador);
  if (inicio < 0) throw new Error(`Falta el reporte ${marcador}.`);
  const fin = salida.indexOf("\n", inicio);
  const json = salida
    .slice(inicio + marcador.length, fin < 0 ? undefined : fin)
    .trim();
  const datos: unknown = JSON.parse(json);
  if (!Array.isArray(datos))
    throw new Error(`El reporte ${marcador} no es una lista.`);
  return datos;
};

export type CalleRechazadaDeSalida = {
  subdominio: string;
  sectorId: LugarId;
  calleId: CalleId;
  lugarRealId: LugarId;
};
export const parsearCallesRechazadas = (
  salida: string,
): CalleRechazadaDeSalida[] =>
  extraerJsonDeNotice(salida, "__B3D_CALLES_RECHAZADAS_JSON__:").map(
    (fila): CalleRechazadaDeSalida => {
      if (
        !esRegistro(fila) ||
        typeof fila.subdominio !== "string" ||
        typeof fila.sector_id !== "string" ||
        typeof fila.calle_id !== "string" ||
        typeof fila.lugar_real_id !== "string"
      )
        throw new Error("Calle rechazada invalida.");
      return {
        subdominio: fila.subdominio,
        sectorId: comoLugarId(fila.sector_id),
        calleId: comoCalleId(fila.calle_id),
        lugarRealId: comoLugarId(fila.lugar_real_id),
      };
    },
  );

export type ZonaDuplicadaDeSalida = {
  subdominio: string;
  asentamientoId: LugarId;
  nombre: string;
  sectorIds: LugarId[];
};
export const parsearZonasDuplicadas = (
  salida: string,
): ZonaDuplicadaDeSalida[] =>
  extraerJsonDeNotice(salida, "__B3D_ZONAS_DUPLICADAS_JSON__:").map(
    (fila): ZonaDuplicadaDeSalida => {
      if (
        !esRegistro(fila) ||
        typeof fila.subdominio !== "string" ||
        typeof fila.asentamiento_id !== "string" ||
        typeof fila.nombre !== "string" ||
        !Array.isArray(fila.sector_ids)
      )
        throw new Error("Zona duplicada invalida.");
      return {
        subdominio: fila.subdominio,
        asentamientoId: comoLugarId(fila.asentamiento_id),
        nombre: fila.nombre,
        sectorIds: fila.sector_ids.map((id) => comoLugarId(String(id))),
      };
    },
  );

export type RegistroDependienteDeSalida = {
  subdominio: string;
  entidad: string;
  entidadId: string;
  lugarId: LugarId;
};
export const parsearRegistrosDependientes = (
  salida: string,
): RegistroDependienteDeSalida[] =>
  extraerJsonDeNotice(salida, "__B3D_REGISTROS_DEPENDIENTES_JSON__:").map(
    (fila): RegistroDependienteDeSalida => {
      if (
        !esRegistro(fila) ||
        typeof fila.subdominio !== "string" ||
        typeof fila.entidad !== "string" ||
        typeof fila.entidad_id !== "string" ||
        typeof fila.lugar_id !== "string"
      )
        throw new Error("Registro dependiente invalido.");
      return {
        subdominio: fila.subdominio,
        entidad: fila.entidad,
        entidadId: fila.entidad_id,
        lugarId: comoLugarId(fila.lugar_id),
      };
    },
  );
