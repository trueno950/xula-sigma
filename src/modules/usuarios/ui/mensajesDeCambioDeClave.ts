import { RUTA_DE_CAMBIO_DE_CLAVE } from "@/shared/auth";
import { LARGO_MINIMO } from "@/shared/auth/reglasDeClave";

/**
 * El vocabulario cerrado del cambio obligatorio de contrasenia (S2).
 *
 * En la URL viaja el **codigo**, nunca el texto ni la clave: `?error=` lo
 * escribe cualquiera desde la barra de direcciones y ademas queda en el
 * historial y en el log de accesos. El mensaje vive aca, del lado del
 * servidor, y lo que no esta en la lista no pinta nada.
 *
 * El minimo de la clave se lee de `reglasDeClave` —una sola fuente con el
 * formulario y con `minPasswordLength` de Better Auth— en vez de repetir el
 * numero.
 */

export const CODIGOS_DE_CAMBIO_DE_CLAVE = [
  /** Las dos claves escritas no coinciden. */
  "no-coincide",
  /** No alcanza el minimo de `reglasDeClave`. */
  "corta",
  /** Es la misma temporal que le dictaron. */
  "repetida",
  "generico",
] as const;

export type CodigoDeCambioDeClave = (typeof CODIGOS_DE_CAMBIO_DE_CLAVE)[number];

const MENSAJES: Record<CodigoDeCambioDeClave, string> = {
  "no-coincide": "Las dos contraseñas no coinciden.",
  corta: `La contraseña necesita al menos ${LARGO_MINIMO} caracteres.`,
  repetida: "La contraseña nueva tiene que ser distinta de la temporal.",
  generico: "No se pudo cambiar la contraseña. Intente de nuevo.",
};

export const esCodigoDeCambioDeClave = (
  valor: unknown,
): valor is CodigoDeCambioDeClave =>
  typeof valor === "string" &&
  (CODIGOS_DE_CAMBIO_DE_CLAVE as readonly string[]).includes(valor);

/** El mensaje para la persona, o `null` si el parametro no es un codigo. */
export const mensajeDeCambioDeClave = (valor: unknown): string | null =>
  esCodigoDeCambioDeClave(valor) ? MENSAJES[valor] : null;

/** A donde vuelve un rechazo: la misma pantalla, con su codigo. */
export const rutaDeCambioDeClave = (error: CodigoDeCambioDeClave): string =>
  `${RUTA_DE_CAMBIO_DE_CLAVE}?error=${error}`;
