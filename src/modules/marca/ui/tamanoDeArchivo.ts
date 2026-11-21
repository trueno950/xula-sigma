import { BYTES_MAXIMOS } from "../domain/png";
import { MENSAJES_DE_ERROR_DE_ESCUDO } from "./mensajesDeMarca";

/**
 * El rechazo por peso que la pantalla puede dar **antes** de mandar el
 * archivo (E1, S9).
 *
 * Hace falta porque el transporte de Next corta el cuerpo en 2 MB: un
 * archivo de 5 MiB —o de 1.5— nunca llega a la accion, y sin este chequeo la
 * operadora recibia una pagina de error del framework en vez de la oracion
 * de siempre. El umbral y la oracion son los del servidor
 * (`BYTES_MAXIMOS`, `MENSAJES_DE_ERROR_DE_ESCUDO`), asi que el mensaje es el
 * mismo por los dos caminos.
 */
export const archivoDemasiadoGrande = (
  archivo: { size: number } | undefined,
): string | undefined =>
  archivo && archivo.size > BYTES_MAXIMOS
    ? MENSAJES_DE_ERROR_DE_ESCUDO["escudo-pesado"]
    : undefined;
