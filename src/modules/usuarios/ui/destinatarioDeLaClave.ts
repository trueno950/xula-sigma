import { cookies } from "next/headers";
import { z } from "zod";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";

/**
 * De quien era la contrasenia temporal que esta peticion ya no puede mostrar
 * (S11 de `usuarios-ux`).
 *
 * **Por que hace falta una cookie aparte.** La clave viaja en su propia
 * cookie y la consume el proxy en la unica peticion que trae su token
 * (`claveMostradaEnTransito.ts`), asi que en la recarga no queda nada que
 * diga de quien era: el listado sabe de quien es cada cuenta, pero no cual de
 * ellas acaba de recibir una clave. Guardar el `usuarioId` y el token de la
 * clave en una cookie que nadie consume —y que vence sola a los 120
 * segundos— es lo que deja a la pantalla nombrar a la persona y ofrecer
 * restablecer su contrasenia, que es lo que S11 pide.
 *
 * **No lleva la clave**, y no la va a llevar: es un `usuarioId` y un token
 * opacos, httpOnly y `SameSite=Lax`, en la misma forma que la cookie del
 * aviso de la baja. Se lee en el servidor y solo se usa para pintar ese
 * aviso; el boton que ofrece va por la accion de siempre, que vuelve a
 * autorizar bajo RLS.
 *
 * No la consume el proxy porque no tiene que ser de un solo uso: recargar
 * con el token en la URL **es** el estado que S11 describe, y lo que no puede
 * pasar es que el aviso siga apareciendo cuando el token ya no esta
 * (`destinatarioDeLaClaveDeLaPeticion` lo exige) o cuando la operadora lo dio
 * por anotado (`olvidarDestinatarioDeLaClave`).
 */

export const NOMBRE_COOKIE_DESTINATARIO = "destinatario-de-la-clave";
export const RUTA_COOKIE_DESTINATARIO = "/usuarios";

const VIGENCIA_EN_SEGUNDOS = 120;

const esquema = z.tuple([z.uuid(), z.uuid()]);

export type DestinatarioDeLaClave = { token: string; usuarioId: string };

const codificar = ({ token, usuarioId }: DestinatarioDeLaClave): string =>
  `${token}:${usuarioId}`;

/**
 * El esquema tiene dientes porque la cookie la puede reescribir el navegador:
 * lo que no sean dos uuid se ignora entero en vez de nombrar a medias.
 */
const decodificar = (
  valor: string | undefined,
): DestinatarioDeLaClave | null => {
  if (!valor) return null;
  const analisis = esquema.safeParse(valor.split(":"));

  return analisis.success
    ? { token: analisis.data[0], usuarioId: analisis.data[1] }
    : null;
};

const opciones = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV !== "development",
  path: RUTA_COOKIE_DESTINATARIO,
  maxAge: VIGENCIA_EN_SEGUNDOS,
} as const;

/**
 * Se escribe junto a la cookie de la clave, y **no puede tumbar la accion**:
 * lo unico que agrega es el nombre en un aviso posterior. Si falla, la clave
 * se sigue mostrando igual y queda en el log.
 */
export const recordarDestinatarioDeLaClave = async (
  destinatario: DestinatarioDeLaClave,
): Promise<void> => {
  try {
    (await cookies()).set(
      NOMBRE_COOKIE_DESTINATARIO,
      codificar(destinatario),
      opciones,
    );
  } catch (error) {
    console.error(
      "[usuarios] destinatario de la clave",
      datosSegurosDeError(error),
    );
  }
};

/** Sin el token de la URL no dice nada: otra visita no nombra a nadie. */
export const destinatarioDeLaClaveDeLaPeticion = async (
  token: string | undefined,
): Promise<DestinatarioDeLaClave | null> => {
  if (!token) return null;
  const guardado = decodificar(
    (await cookies()).get(NOMBRE_COOKIE_DESTINATARIO)?.value,
  );

  return guardado?.token === token ? guardado : null;
};

/** La operadora dio la clave por anotada: no hay nada mas que ofrecer. */
export const olvidarDestinatarioDeLaClave = async (): Promise<void> => {
  (await cookies()).delete({
    name: NOMBRE_COOKIE_DESTINATARIO,
    path: RUTA_COOKIE_DESTINATARIO,
  });
};
