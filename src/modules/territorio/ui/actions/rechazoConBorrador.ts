import type { BorradorDeDomicilio } from "../borradorDeDomicilio";
import { guardarBorrador } from "../borradorEnCookie";
import { type NavegacionDeError, volverAlArbol } from "./volverAlArbol";

/** La navegacion del rechazo, con el token que nombra al borrador. */
export const conToken = (
  navegacion: NavegacionDeError,
  borrador: BorradorDeDomicilio,
): NavegacionDeError => ({ ...navegacion, borrador: borrador.token });

/** El rechazo de un formulario invalido, con lo capturado guardado. */
export const volverConBorrador = async (
  navegacion: NavegacionDeError,
  borrador: BorradorDeDomicilio,
  mensaje: string,
): Promise<void> => {
  await guardarBorrador(borrador);
  volverAlArbol(conToken(navegacion, borrador), mensaje);
};

/** El mensaje del rechazo del caso de uso, con lo capturado guardado antes del redirect. */
export const guardandoBorrador =
  (borrador: BorradorDeDomicilio, mensajeDeError: (error: unknown) => string) =>
  async (error: unknown): Promise<string> => {
    const mensaje = mensajeDeError(error);
    await guardarBorrador(borrador);
    return mensaje;
  };
