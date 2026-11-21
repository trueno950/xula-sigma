import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { tokenDelCuerpo } from "./tokenDelCuerpo";

/**
 * El borde de los `POST` que descartan una cookie de un solo uso: el aviso de
 * la baja y la contrasenia temporal.
 *
 * Las dos rutas hacen exactamente esto —leer el token, borrar la cookie de
 * quien manda la peticion, no contar nada—, asi que lo hacen en un solo
 * lugar: dos copias del mismo borde se desincronizan el dia que una cambie un
 * codigo de respuesta.
 *
 * Un token ajeno responde lo mismo que uno propio para no informar nada, y el
 * token viaja en el cuerpo y no en la URL, que queda en el historial y en el
 * log de accesos.
 */
export const responderDescarte = async ({
  request,
  descartar,
  etiqueta,
}: {
  request: Request;
  descartar: (token: string) => Promise<void>;
  etiqueta: string;
}): Promise<Response> => {
  const token = await tokenDelCuerpo(request);

  if (!token) return new Response(null, { status: 400 });

  try {
    await descartar(token);
  } catch (error) {
    console.error(`[usuarios] ${etiqueta}`, datosSegurosDeError(error));
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 204 });
};
