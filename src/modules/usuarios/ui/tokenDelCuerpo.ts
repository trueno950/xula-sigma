import { z } from "zod";

/**
 * El token que llega en el cuerpo de los `POST` que descartan una cookie de
 * un solo uso (`/usuarios/aviso`, `/usuarios/clave-temporal`).
 *
 * Vive aca y no en cada `route.ts` porque los dos tienen la misma forma y el
 * mismo borde: un cuerpo que no es JSON, o un token que no es un uuid, no es
 * un error del servidor —es un pedido mal armado— y se descarta entero en vez
 * de adivinarse.
 */
const esquemaDeToken = z.string().trim().uuid();

const cuerpoDe = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
};

const tokenCrudo = (cuerpo: unknown): unknown =>
  typeof cuerpo === "object" && cuerpo !== null && "token" in cuerpo
    ? cuerpo.token
    : undefined;

export const tokenDelCuerpo = async (
  request: Request,
): Promise<string | null> => {
  const analisis = esquemaDeToken.safeParse(
    tokenCrudo(await cuerpoDe(request)),
  );

  return analisis.success ? analisis.data : null;
};
