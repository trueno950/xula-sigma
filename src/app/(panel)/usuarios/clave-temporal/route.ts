import { claveEntregadaDe } from "@/modules/usuarios/ui/claveMostrada";
import { tomarClaveMostrada } from "@/modules/usuarios/ui/claveTemporalEnCookie";
import {
  responderConToken,
  SIN_CACHE,
} from "@/modules/usuarios/ui/routeDeDescarte";

/**
 * `POST /usuarios/clave-temporal`: entrega la contrasenia temporal **una sola
 * vez** y borra su cookie en la misma respuesta (S4 de `usuarios-seguridad`),
 * sin redibujar la ruta. Por que es un Route Handler y no una Server Action:
 * `AGENTS.md`, seccion Server Actions, nota de `usuarios`.
 *
 * **La clave no viaja en el payload de la pantalla.** El router de Next
 * guarda ese payload y lo vuelve a pintar al volver con «Atras», asi que la
 * tarjeta recibe el token y la isla le pide la clave aca: la primera peticion
 * se la lleva y la segunda ya no encuentra nada. Sin JavaScript el proxy sigue
 * siendo el que la muestra, en el unico HTML que ese navegador va a ver.
 *
 * **No lee tenant ni base**: solo entrega y borra la cookie de quien manda la
 * peticion, y solo si el token coincide con el guardado. Un token ajeno
 * responde lo mismo que uno vencido para no informar nada, y ninguna respuesta
 * se guarda en cache.
 */
export async function POST(request: Request): Promise<Response> {
  return responderConToken({
    request,
    etiqueta: "clave mostrada",
    atender: async (token) => {
      const mostrada = await tomarClaveMostrada(token);

      return mostrada
        ? Response.json(claveEntregadaDe(mostrada), { headers: SIN_CACHE })
        : new Response(null, { status: 404, headers: SIN_CACHE });
    },
  });
}
