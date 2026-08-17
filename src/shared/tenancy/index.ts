/**
 * Superficie publica de tenancy.
 *
 * No hay nada que devuelva un manejador de base de datos.
 *
 * Toda consulta entra por `withTenant`, con UNA excepcion declarada:
 * `resolverAyuntamientoPorSubdominio`. Por que se permite y por que no
 * abre un agujero esta en `withTenant.ts`, sobre la funcion;
 * `resolverAyuntamiento.isolation.test.ts` lo recorre tabla por tabla.
 *
 * `contexto.ts` NO se reexporta aca: ver el encabezado de ese archivo.
 * Quien lo necesite lo importa por ruta directa.
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
