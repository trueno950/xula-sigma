import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { CorreoYaRegistradoError, RolNoAsignableError } from "../../domain";
import type { CodigoDeError } from "../mensajesDeError";

/**
 * La lista blanca que traduce el error a un **codigo**, compartida por las
 * tres acciones del panel. El mensaje que ve la operadora lo pone la
 * pantalla (`mensajesDeError.ts`), porque la URL solo puede llevar
 * vocabulario cerrado.
 *
 * Lo que no esta en la lista cae en el generico de la accion y deja su traza
 * en el log: un error de Postgres tambien es `Error` y su `.message` no esta
 * escrito para nadie. Misma regla que
 * `padron/ui/actions/altaDePersona.action.ts`.
 */
export const codigoDeErrorParaLaOperadora = (
  error: unknown,
  asunto: string,
  generico: CodigoDeError,
): CodigoDeError => {
  if (error instanceof NoAutorizadoError) return "sin-permiso";
  if (error instanceof NoEncontradoError) return "no-encontrado";
  if (error instanceof RolNoAsignableError) return "rol-no-asignable";
  if (error instanceof CorreoYaRegistradoError) return "correo-ya-registrado";

  console.error(`[usuarios] ${asunto} fallo`, datosSegurosDeError(error));

  return generico;
};
