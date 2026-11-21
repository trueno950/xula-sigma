import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import {
  type ClaveEntregada,
  decodificarClaveEntregada,
} from "./claveMostrada";

/**
 * Le pide al servidor la contrasenia temporal de esta peticion (S4 de
 * `usuarios-seguridad`). El `POST` lleva el token en el cuerpo —nunca en la
 * URL, que queda en el historial y en el log de accesos— y el servidor
 * entrega la clave y borra la cookie en el mismo viaje, asi que la segunda
 * peticion ya no recibe nada.
 *
 * La clave no se guarda en ningun lado: vive en el estado de la isla hasta que
 * la pantalla se va. Un fallo —red, `500` o una respuesta que no tiene la
 * forma esperada— devuelve `null`, igual que una cookie vencida: la pantalla
 * cae al estado «ya no se puede mostrar» y ofrece restablecer, que es el unico
 * camino para tener otra. La clave no se registra nunca.
 */

export const RUTA_DE_LA_CLAVE = "/usuarios/clave-temporal";

export const pedirLaClave = async (
  token: string,
): Promise<ClaveEntregada | null> => {
  try {
    const respuesta = await fetch(RUTA_DE_LA_CLAVE, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
      keepalive: true,
    });

    if (!respuesta.ok) return null;

    return decodificarClaveEntregada(await respuesta.json());
  } catch (error) {
    console.error("[usuarios] pedir la clave", datosSegurosDeError(error));

    return null;
  }
};
