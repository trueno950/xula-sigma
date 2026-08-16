/**
 * Superficie publica de tenancy.
 *
 * No hay nada que devuelva un manejador de base de datos. Quien necesite
 * hablar con la base entra por `withTenant` y solo por ahi.
 */

export * as esquema from "./esquema";
export type { TransaccionTenant } from "./withTenant";
export { cerrarConexion, withTenant } from "./withTenant";
