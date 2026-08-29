import {
  crearAltaDeCalle,
  crearAltaDeLugar,
  crearDarDeBajaLugar,
  crearEditarLugar,
  crearListarCalles,
  crearLugarPorId,
  crearRenombrarCalle,
  crearReparentearLugar,
  crearSubarbol,
} from "./application";
import {
  repositorioDeCallesSql,
  repositorioDeLugaresSql,
} from "./infrastructure";

/**
 * Raiz de composicion del modulo (precedente: `padron/composicion.ts`).
 */
export const altaDeLugar = crearAltaDeLugar(repositorioDeLugaresSql);
export const editarLugar = crearEditarLugar(repositorioDeLugaresSql);
export const darDeBajaLugar = crearDarDeBajaLugar(repositorioDeLugaresSql);
export const reparentearLugar = crearReparentearLugar(repositorioDeLugaresSql);
export const subarbol = crearSubarbol(repositorioDeLugaresSql);
export const lugarPorId = crearLugarPorId(repositorioDeLugaresSql);
export const altaDeCalle = crearAltaDeCalle(repositorioDeCallesSql);
export const renombrarCalle = crearRenombrarCalle(repositorioDeCallesSql);
export const listarCalles = crearListarCalles(repositorioDeCallesSql);
