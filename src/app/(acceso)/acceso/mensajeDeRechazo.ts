import { CLAVE_TEMPORAL_CADUCADA } from "@/shared/auth/codigosDeAcceso";

/**
 * Lo que la pantalla de acceso le dice a la persona cuando el servidor
 * rechaza el intento.
 *
 * **Un solo mensaje para todos los rechazos de credencial.** Distinguir "no
 * existe" de "contrasenia incorrecta" confirma que la cuenta existe, y con
 * eso se enumera quien trabaja en el municipio. Los cuatro caminos
 * —inexistente, clave incorrecta, dado de baja, otro municipio— dicen lo
 * mismo.
 *
 * **La temporal caducada es la unica excepcion, y no rompe la regla.** Ese
 * rechazo solo se produce despues de que la contrasenia verifico: quien lo
 * ve ya la sabia, asi que no le confirma nada que no supiera. Sin la clave
 * correcta el servidor contesta lo mismo que a una cuenta inexistente, y el
 * test de integracion lo afirma comparando los dos cuerpos.
 */

export const CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos.";

export const DEMASIADOS_INTENTOS = "Demasiados intentos. Espere unos minutos.";

export const TEMPORAL_CADUCADA =
  "La contraseña temporal caducó. Pida a quien administra su ayuntamiento que se la restablezca.";

const esCaducada = (cuerpo: unknown): boolean =>
  typeof cuerpo === "object" &&
  cuerpo !== null &&
  "code" in cuerpo &&
  cuerpo.code === CLAVE_TEMPORAL_CADUCADA;

export function mensajeDeRechazo(respuesta: {
  status: number;
  cuerpo: unknown;
}): string {
  if (respuesta.status === 429) return DEMASIADOS_INTENTOS;
  if (esCaducada(respuesta.cuerpo)) return TEMPORAL_CADUCADA;

  return CREDENCIALES_INVALIDAS;
}
