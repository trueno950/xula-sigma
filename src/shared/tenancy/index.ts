/**
 * Superficie publica de tenancy.
 *
 * No hay nada que devuelva un manejador de base de datos.
 *
 * Toda consulta entra por `withTenant`, con UNA excepcion declarada:
 * `resolverAyuntamientoPorSubdominio`. Corre sin tenant porque resuelve el
 * tenant, y eso pasa antes de que exista uno. No es un permiso general
 * para consultar sin aislamiento: esta acotada al directorio publico de
 * `ayuntamientos`, y lo que la contiene no es su buena conducta sino RLS
 * — cualquier otra tabla, por esa misma conexion, devuelve cero filas.
 * Hay un test que lo recorre tabla por tabla.
 *
 * `contexto.ts` NO se reexporta aca a proposito: importa `next/headers`, y
 * arrastrarlo desde este indice ataria al framework a todo el que use
 * tenancy — incluidos los tests de aislamiento, que corren en Node sin un
 * request. Quien lo necesite lo importa por ruta directa.
 */

export type { AyuntamientoId } from "./ayuntamientoId";
export { comoAyuntamientoId, esAyuntamientoId } from "./ayuntamientoId";
export {
  CABECERA_SUBDOMINIO,
  CABECERA_SUPERFICIE,
} from "./cabeceras";
export * as esquema from "./esquema";
export type { Subdominio } from "./subdominio";
export { leerSubdominio } from "./subdominio";
export type { AyuntamientoResuelto, TransaccionTenant } from "./withTenant";
export {
  cerrarConexion,
  resolverAyuntamientoPorSubdominio,
  withTenant,
} from "./withTenant";
