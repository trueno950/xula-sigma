/**
 * Superficie publica de tenancy.
 *
 * No hay nada que devuelva un manejador de base de datos.
 *
 * Toda consulta de la operacion entra por `withTenant`. Que mas corre sin
 * tenant, y por que cada una esta sancionada, vive en la regla 2 de
 * `AGENTS.md`: ahi esta la lista y aca no, porque una lista copiada tiene
 * una copia vieja siempre. Cada funcion explica lo suyo en su archivo, y
 * `resolverAyuntamiento.isolation.test.ts` recorre tabla por tabla que la
 * conexion sin tenant no alcance nada mas que el directorio publico.
 *
 * **`withAltaDeAyuntamiento` no rompe el patron.**
 * `withTenant` es la puerta de la operacion: entra con un tenant ya
 * resuelto y corre bajo `xula_app`. La otra es la puerta del alta, donde el
 * tenant todavia no existe —se esta creando— y corre bajo `xula_super_admin`
 * con otro conjunto de politicas. Dos superficies con dos conjuntos de
 * privilegios, no la misma superficie con un atajo. Lo que comparten es la
 * forma: la conexion es privada del modulo y la unica salida es la funcion.
 *
 * Consecuencia de exportarla aca, que conviene tener presente: importar
 * este barril exige `SUPER_ADMIN_DATABASE_URL`, porque `provision.ts` la
 * valida al cargarse. Es deliberado y es el mismo criterio que `DATABASE_URL`
 * en `withTenant.ts`: una variable de conexion faltante tiene que reventar
 * al arrancar y no en el primer alta de municipio. Quien solo necesite
 * resolver un subdominio —`proxy.ts`, por ejemplo— importa por ruta directa.
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
export { withAltaDeAyuntamiento } from "./provision";
export type { Subdominio } from "./subdominio";
export { leerSubdominio } from "./subdominio";
export type { AyuntamientoResuelto, TransaccionTenant } from "./withTenant";
export {
  cerrarConexion,
  resolverAyuntamientoPorSubdominio,
  withTenant,
} from "./withTenant";
