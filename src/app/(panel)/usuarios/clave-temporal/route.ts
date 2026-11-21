import { descartarClaveMostrada } from "@/modules/usuarios/ui/claveTemporalEnCookie";
import { responderDescarte } from "@/modules/usuarios/ui/routeDeDescarte";

/**
 * `POST /usuarios/clave-temporal`: borra la cookie de la contrasenia
 * temporal **sin redibujar la ruta** (S9 de `usuarios-ux`). Por que es un
 * Route Handler y no una Server Action: `AGENTS.md`, seccion Server Actions,
 * nota de `usuarios`.
 *
 * **No lee tenant ni base**: solo borra la cookie de quien manda la
 * peticion, y solo si el token coincide con el guardado. Un token ajeno
 * responde lo mismo que uno propio para no informar nada, y el token viaja
 * en el cuerpo y no en la URL.
 */
export async function POST(request: Request): Promise<Response> {
  return responderDescarte({
    request,
    descartar: descartarClaveMostrada,
    etiqueta: "clave mostrada",
  });
}
