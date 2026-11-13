export * from "./composicionDeDomicilios";
export * from "./composicionDeExportacion";
export * from "./composicionDeZonas";

import {
  crearAltaDeCalle,
  crearAltaDeLugar,
  crearCallePorId,
  crearCallePorIdEnTransaccion,
  crearCallesParaMapa,
  crearContarContenidoDeLugares,
  crearDarDeBajaCalle,
  crearDarDeBajaLugar,
  crearDireccionVigenteDePersona,
  crearEditarLugar,
  crearExisteCabecera,
  crearHistorialDeResidencias,
  crearListarCalles,
  crearListarCallesDelMunicipio,
  crearListarLugares,
  crearListarRaices,
  crearLugarPorId,
  crearRegistrarMudanza,
  crearRenombrarCalle,
  crearReparentearCalle,
  crearReparentearLugar,
  crearResidentesDe,
  crearSubarbol,
  crearUbicacionDeLugar,
  crearUbicacionDeLugarEnTransaccion,
  crearUbicarCalle,
} from "./application";
import {
  crearLectorDePersonasPorPadron,
  lectorDeCallesDeMapaSql,
  lectorDeContenidoDeLugaresSql,
  lectorDeDireccionesSql,
  lectorDeUbicacionesSql,
  repositorioDeCallesSql,
  repositorioDeDomiciliosSql,
  repositorioDeLugaresSql,
  repositorioDeResidenciasSql,
} from "./infrastructure";

/**
 * Raiz de composicion del modulo (precedente: `padron/composicion.ts`).
 */
export const altaDeLugar = crearAltaDeLugar(repositorioDeLugaresSql);
export const editarLugar = crearEditarLugar(repositorioDeLugaresSql);
export const existeCabecera = crearExisteCabecera(repositorioDeLugaresSql);
export const darDeBajaLugar = crearDarDeBajaLugar(repositorioDeLugaresSql);
export const darDeBajaCalle = crearDarDeBajaCalle(repositorioDeCallesSql);
export const reparentearLugar = crearReparentearLugar(repositorioDeLugaresSql);
export const reparentearCalle = crearReparentearCalle(
  repositorioDeCallesSql,
  repositorioDeLugaresSql,
);
export const subarbol = crearSubarbol(repositorioDeLugaresSql);
export const lugarPorId = crearLugarPorId(repositorioDeLugaresSql);
export const altaDeCalle = crearAltaDeCalle(
  repositorioDeCallesSql,
  repositorioDeLugaresSql,
);
export const renombrarCalle = crearRenombrarCalle(repositorioDeCallesSql);
export const ubicarCalle = crearUbicarCalle(repositorioDeCallesSql);
export const listarCalles = crearListarCalles(repositorioDeCallesSql);
export const listarCallesDelMunicipio = crearListarCallesDelMunicipio(
  lectorDeCallesDeMapaSql,
  repositorioDeLugaresSql,
);
export const callesParaMapa = crearCallesParaMapa(lectorDeCallesDeMapaSql);
export const callePorId = crearCallePorId(lectorDeCallesDeMapaSql);
export const callePorIdEnTransaccion = crearCallePorIdEnTransaccion(
  lectorDeCallesDeMapaSql,
);
export const listarLugares = crearListarLugares(repositorioDeLugaresSql);
export const listarRaices = crearListarRaices(repositorioDeLugaresSql);
export const contarContenidoDeLugares = crearContarContenidoDeLugares(
  lectorDeContenidoDeLugaresSql,
);
export const registrarMudanza = crearRegistrarMudanza(
  repositorioDeResidenciasSql,
  repositorioDeDomiciliosSql,
  crearLectorDePersonasPorPadron,
);
export const historialDeResidencias = crearHistorialDeResidencias(
  repositorioDeResidenciasSql,
  lectorDeDireccionesSql,
  crearLectorDePersonasPorPadron,
);
export const direccionVigenteDePersona = crearDireccionVigenteDePersona(
  repositorioDeResidenciasSql,
  lectorDeDireccionesSql,
  crearLectorDePersonasPorPadron,
);
export const residentesDe = crearResidentesDe(
  repositorioDeDomiciliosSql,
  repositorioDeResidenciasSql,
);
export const ubicacionDeLugar = crearUbicacionDeLugar(lectorDeUbicacionesSql);
export const ubicacionDeLugarEnTransaccion = crearUbicacionDeLugarEnTransaccion(
  lectorDeUbicacionesSql,
);
