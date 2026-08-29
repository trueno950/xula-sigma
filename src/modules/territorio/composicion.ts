import {
  crearAltaDeCalle,
  crearAltaDeDomicilio,
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
  repositorioDeDomiciliosSql,
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
export const altaDeCalle = crearAltaDeCalle(
  repositorioDeCallesSql,
  repositorioDeLugaresSql,
);
export const renombrarCalle = crearRenombrarCalle(repositorioDeCallesSql);
export const listarCalles = crearListarCalles(repositorioDeCallesSql);
export const altaDeDomicilio = crearAltaDeDomicilio(
  repositorioDeDomiciliosSql,
  repositorioDeLugaresSql,
  repositorioDeCallesSql,
);
