import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import {
  type ClaveMostrada,
  codificarClaveMostrada,
  decodificarClaveMostrada,
} from "./claveMostrada";

/**
 * Donde vive la contrasenia temporal entre la accion que la genera y la
 * pantalla que la muestra una sola vez (S4: «No viaja en la URL ni queda en
 * los logs»).
 *
 * **En la URL no puede ir**: quedaría en el historial del navegador y en el
 * log de accesos del servidor, que es exactamente lo que la decision
 * prohibe. Va en una cookie httpOnly, `SameSite=Lax`, solo para `/usuarios`
 * y de 120 segundos. La URL lleva unicamente el token, y la pantalla la
 * aplica solo si coincide: cualquier otra navegacion no la muestra.
 *
 * Un Server Component lee cookies pero no las borra: solo una Server
 * Function puede, y por eso el aviso monta `DescartarClaveAlMostrar`, que
 * la consume en la primera pintura. Recargar o retroceder a la misma URL
 * ya no la muestra. Sin JavaScript la cookie vive hasta que vence.
 *
 * Las dos acciones que escriben esta cookie son un `<form>` nativo que
 * redirige, la excepcion de `AGENTS.md` en la seccion Server Actions.
 */
const NOMBRE = "clave-temporal-de-usuario";
const RUTA = "/usuarios";
const VIGENCIA_EN_SEGUNDOS = 120;

export const guardarClaveMostrada = async (
  datos: Omit<ClaveMostrada, "token">,
): Promise<ClaveMostrada> => {
  const mostrada: ClaveMostrada = { token: randomUUID(), ...datos };

  (await cookies()).set(NOMBRE, codificarClaveMostrada(mostrada), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
    path: RUTA,
    maxAge: VIGENCIA_EN_SEGUNDOS,
  });

  return mostrada;
};

/** Sin token en la URL no se lee la cookie: ninguna otra visita la toca. */
export const claveMostradaDeLaPeticion = async (
  token: string | undefined,
): Promise<ClaveMostrada | null> => {
  if (!token) return null;
  const mostrada = decodificarClaveMostrada(
    (await cookies()).get(NOMBRE)?.value,
  );

  return mostrada?.token === token ? mostrada : null;
};

/** Solo la borra si el token es el suyo: otra visita no toca esta cookie. */
export const descartarClaveMostrada = async (token: string): Promise<void> => {
  const almacen = await cookies();
  const mostrada = decodificarClaveMostrada(almacen.get(NOMBRE)?.value);

  if (mostrada?.token === token) almacen.delete({ name: NOMBRE, path: RUTA });
};
