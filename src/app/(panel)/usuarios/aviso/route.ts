import { descartarAvisoPendiente } from "@/modules/usuarios/ui/avisoPendienteEnCookie";
import { responderDescarte } from "@/modules/usuarios/ui/routeDeDescarte";

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
 * y solo si el token coincide con el guardado.
 */
export async function POST(request: Request): Promise<Response> {
  return responderDescarte({
    request,
    descartar: descartarAvisoPendiente,
    etiqueta: "aviso de la baja",
  });
}
