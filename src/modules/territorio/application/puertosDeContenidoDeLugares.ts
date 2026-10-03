import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import type { LugarId, TipoDeLugar } from "../domain";

/**
 * Las cuentas de un lugar del arbol. `domicilios` es del subarbol entero,
 * no solo los colgados directo. `calles` es `null` cuando el tipo no tiene
 * catalogo propio: ahi un cero no significa "falta cargarlas".
 */
export type ConteoDeLugar = {
  lugarId: LugarId;
  domicilios: number;
  calles: number | null;
};

/** Lo que el lector crudo devuelve: el tipo decide despues si las calles cuentan. */
export type ConteoCrudoDeLugar = {
  lugarId: LugarId;
  tipo: TipoDeLugar;
  domicilios: number;
  calles: number;
};

/**
 * Lado de lectura de las cuentas del arbol de `/territorio`: una sola
 * consulta agrupada para todos los lugares activos del tenant, nunca una
 * por fila. Solo cuenta filas activas (`baja_en IS NULL`).
 */
export type LectorDeContenidoDeLugares = {
  contarPorLugar(tx: TransaccionTenant): Promise<readonly ConteoCrudoDeLugar[]>;
};
