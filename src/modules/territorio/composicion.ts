import type { PorcionExportable } from "@/shared/exportacion/exportar";

export * from "./composicionDeDomicilios";

import {
  crearAltaDeCalle,
  crearAltaDeLugar,
  crearCallePorId,
  crearCallePorIdEnTransaccion,
  crearCallesParaMapa,
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
  lectorDeDireccionesSql,
  lectorDeUbicacionesSql,
  repositorioDeCallesSql,
  repositorioDeDomiciliosSql,
  repositorioDeLugaresSql,
  repositorioDeResidenciasSql,
} from "./infrastructure";
import {
  calles,
  domicilios,
  lugares,
  residencias,
} from "./infrastructure/esquema";

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
export const registrarMudanza = crearRegistrarMudanza(
  repositorioDeResidenciasSql,
  repositorioDeDomiciliosSql,
  crearLectorDePersonasPorPadron,
);
export const historialDeResidencias = crearHistorialDeResidencias(
  repositorioDeResidenciasSql,
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

/**
 * Cuatro porciones planas, no una vista compuesta "domicilio con
 * residentes" (design.md seccion 10): un join denormalizado pierde
 * filas -un domicilio sin residentes desaparece de un inner join, y una
 * casa deshabitada es un registro valido-. Columnas explicitas, nunca
 * `select()` pelado, mismo criterio que `porcionDePadron`. Sin
 * `ayuntamientoId`: redundante, ya lo sabe quien pide la exportacion.
 * `residencias.personaId` viaja crudo -es un uuid, el conjunto `personas`
 * ya va en el mismo archivo, y esconderlo dejaria un historial que no se
 * puede leer-. Sin guarda de rol nueva: `puedeExportar` ya cierra la
 * exportacion entera aguas arriba, en `exportarAyuntamiento`.
 */
export const porcionesDeTerritorio: readonly PorcionExportable[] = [
  {
    nombre: "lugares",
    leer: (tx) =>
      tx
        .select({
          id: lugares.id,
          tipo: lugares.tipo,
          nombre: lugares.nombre,
          padreId: lugares.padreId,
          bajaEn: lugares.bajaEn,
          creadoEn: lugares.creadoEn,
          actualizadoEn: lugares.actualizadoEn,
        })
        .from(lugares),
  },
  {
    nombre: "calles",
    leer: (tx) =>
      tx
        .select({
          id: calles.id,
          nombre: calles.nombre,
          lugarId: calles.lugarId,
          latitud: calles.latitud,
          longitud: calles.longitud,
          bajaEn: calles.bajaEn,
          creadoEn: calles.creadoEn,
          actualizadoEn: calles.actualizadoEn,
        })
        .from(calles),
  },
  {
    nombre: "domicilios",
    leer: (tx) =>
      tx
        .select({
          id: domicilios.id,
          lugarId: domicilios.lugarId,
          calleId: domicilios.calleId,
          numero: domicilios.numero,
          entreCalleAId: domicilios.entreCalleAId,
          entreCalleBId: domicilios.entreCalleBId,
          referencia: domicilios.referencia,
          bajaEn: domicilios.bajaEn,
          creadoEn: domicilios.creadoEn,
          actualizadoEn: domicilios.actualizadoEn,
        })
        .from(domicilios),
  },
  {
    nombre: "residencias",
    leer: (tx) =>
      tx
        .select({
          id: residencias.id,
          personaId: residencias.personaId,
          domicilioId: residencias.domicilioId,
          desdeEn: residencias.desdeEn,
          hastaEn: residencias.hastaEn,
          creadoEn: residencias.creadoEn,
        })
        .from(residencias),
  },
];
