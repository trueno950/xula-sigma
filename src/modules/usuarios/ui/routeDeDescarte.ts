import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { tokenDelCuerpo } from "./tokenDelCuerpo";

/**
 * El borde de los `POST` que trabajan con una cookie de un solo uso: el aviso
 * de la baja y la contrasenia temporal.
 *
 * Las dos rutas hacen lo mismo con el token —leerlo del cuerpo, acotar el
 * trabajo a la cookie de quien manda la peticion y no contar nada—, asi que lo
 * hacen en un solo lugar: dos copias del mismo borde se desincronizan el dia
 * que una cambie un codigo de respuesta. Lo que cambia es el trabajo: una
 * borra el aviso, la otra entrega la clave y la borra (S4 de
 * `usuarios-seguridad`).
 *
 * Un token ajeno responde lo mismo que uno propio para no informar nada, el
 * token viaja en el cuerpo y no en la URL -que queda en el historial y en el
 * log de accesos-, y ninguna respuesta se guarda en cache: la clave se
 * entrega una sola vez.
 */
export const SIN_CACHE = { "cache-control": "no-store" } as const;

export const responderConToken = async ({
  request,
  atender,
  etiqueta,
}: {
  request: Request;
  atender: (token: string) => Promise<Response>;
  etiqueta: string;
}): Promise<Response> => {
  const token = await tokenDelCuerpo(request);

  if (!token) return new Response(null, { status: 400, headers: SIN_CACHE });

  try {
    return await atender(token);
  } catch (error) {
    console.error(`[usuarios] ${etiqueta}`, datosSegurosDeError(error));
    return new Response(null, { status: 500, headers: SIN_CACHE });
  }
};

/** El descarte no tiene nada que contar: `204` y se fue. */
export const sinContenido = (): Response =>
  new Response(null, { status: 204, headers: SIN_CACHE });
