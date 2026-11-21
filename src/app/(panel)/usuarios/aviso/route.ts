import { descartarAvisoPendiente } from "@/modules/usuarios/ui/avisoPendienteEnCookie";
import {
  responderConToken,
  sinContenido,
} from "@/modules/usuarios/ui/routeDeDescarte";

/**
 * `POST /usuarios/aviso`: borra la cookie del aviso de la baja **sin
 * redibujar la ruta** (S14 de `usuarios-ux`, el camino con JavaScript).
 *
 * Con JavaScript el proxy no alcanza: su `Set-Cookie` de borrado viaja en el
 * render sintetico del `redirect` de la Server Action, y el navegador no lo
 * guarda. La isla `DescartarAvisoAlMostrar` limpia la URL y llama aca. El
 * porque completo, en `AGENTS.md`, nota de `usuarios`.
 *
 * **No lee tenant ni base**: solo borra la cookie de quien manda la peticion,
 * y solo si el token coincide con la guardada.
 */
export async function POST(request: Request): Promise<Response> {
  return responderConToken({
    request,
    etiqueta: "aviso de la baja",
    atender: async (token) => {
      await descartarAvisoPendiente(token);

      return sinContenido();
    },
  });
}
