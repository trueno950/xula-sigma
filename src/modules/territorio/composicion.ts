import {
  crearAltaDeLugar,
  crearDarDeBajaLugar,
  crearEditarLugar,
  crearLugarPorId,
  crearReparentearLugar,
  crearSubarbol,
} from "./application";
import { repositorioDeLugaresSql } from "./infrastructure";

/**
 * Raiz de composicion del modulo (precedente: `padron/composicion.ts`).
 */
export const altaDeLugar = crearAltaDeLugar(repositorioDeLugaresSql);
export const editarLugar = crearEditarLugar(repositorioDeLugaresSql);
export const darDeBajaLugar = crearDarDeBajaLugar(repositorioDeLugaresSql);
export const reparentearLugar = crearReparentearLugar(repositorioDeLugaresSql);
export const subarbol = crearSubarbol(repositorioDeLugaresSql);
export const lugarPorId = crearLugarPorId(repositorioDeLugaresSql);
