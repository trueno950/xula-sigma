import { z } from "zod";
import { descartarClaveMostrada } from "@/modules/usuarios/ui/claveTemporalEnCookie";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";

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
const esquemaDeEntrada = z.string().trim().uuid();

const tokenDelCuerpo = async (request: Request): Promise<unknown> => {
  try {
    const cuerpo: unknown = await request.json();

    return typeof cuerpo === "object" && cuerpo !== null && "token" in cuerpo
      ? cuerpo.token
      : undefined;
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
};

export async function POST(request: Request): Promise<Response> {
  const analisis = esquemaDeEntrada.safeParse(await tokenDelCuerpo(request));

  if (!analisis.success) return new Response(null, { status: 400 });

  try {
    await descartarClaveMostrada(analisis.data);
  } catch (error) {
    console.error("[usuarios] clave mostrada", datosSegurosDeError(error));
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
