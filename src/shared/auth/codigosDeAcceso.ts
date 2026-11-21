/**
 * Los codigos que viajan en el cuerpo de un rechazo de acceso.
 *
 * **Sin una sola dependencia, y por eso vive aparte.** El codigo lo nombran
 * los dos lados del acceso: el gancho del servidor que rechaza la sesion
 * (`instancia.ts`) y el formulario, que traduce el cuerpo a su mensaje
 * (`mensajeDeRechazo.ts`, `"use client"`). Dejarlo en
 * `claveTemporalEnCuenta.ts` —donde nacio— metia el esquema de Drizzle de
 * auth entero en el bundle de `/acceso` para comparar dos cadenas. Mismo
 * corte, y por la misma razon, que `reglasDeClave.ts`.
 */

/**
 * S1: el rechazo de entrar con una temporal vencida. La pantalla de acceso lo
 * traduce a un mensaje que pide a quien administra que la restablezca; el
 * `code` es el mismo formato que usa Better Auth para los suyos
 * (`INVALID_EMAIL_OR_PASSWORD`).
 */
export const CLAVE_TEMPORAL_CADUCADA = "CLAVE_TEMPORAL_CADUCADA";
