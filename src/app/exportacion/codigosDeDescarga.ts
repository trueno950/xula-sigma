import { z } from "zod";

/**
 * Los codigos con los que el borde de la descarga cuenta un fallo (S13 de
 * `marca-exportacion-ux`) y la traduccion de un estado HTTP a uno de ellos.
 *
 * **El codigo es lo unico que viaja.** El borde redirige a
 * `/exportacion?error=<codigo>` en vez de responder `text/plain` cuando quien
 * pide es el navegador —la navegacion del enlace sin JavaScript no puede
 * recibir un cuerpo que reemplace la pantalla— y el mensaje lo pone la
 * pantalla. Vive aca, al lado del borde y de lo que comparten el borde y la
 * isla, para que la lista cerrada sea una sola.
 */
export const CODIGOS_DE_DESCARGA = [
  "sin-permiso",
  "no-encontrado",
  "fallo",
] as const;

export type CodigoDeDescarga = (typeof CODIGOS_DE_DESCARGA)[number];

const esquemaDeCodigo = z.enum(CODIGOS_DE_DESCARGA);

/** El codigo pedido, o `null` si lo que llego no es uno de los tres. */
export const codigoDeDescarga = (valor: unknown): CodigoDeDescarga | null => {
  const analisis = esquemaDeCodigo.safeParse(valor);

  return analisis.success ? analisis.data : null;
};

export const codigoDeEstado = (estado: number): CodigoDeDescarga => {
  if (estado === 403) return "sin-permiso";
  if (estado === 404) return "no-encontrado";

  return "fallo";
};
