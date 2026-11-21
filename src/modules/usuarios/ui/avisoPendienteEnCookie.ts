import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import {
  CABECERA_AVISO,
  NOMBRE_COOKIE_AVISO,
  RUTA_COOKIE_AVISO,
} from "./avisoEnTransito";
import {
  type AvisoPendiente,
  codificarAvisoPendiente,
  decodificarAvisoPendiente,
} from "./avisoPendiente";

/**
 * Donde vive el aviso de la baja entre la accion que la hizo y la pantalla
 * que lo anuncia una sola vez (S13 y S14 de `usuarios-ux`).
 *
 * **En la URL no puede ir el nombre**: es dato de una persona y quedaria en
 * el historial del navegador y en el log de accesos, que `AGENTS.md`
 * prohibe. La URL lleva solo el token opaco; el aviso va en una cookie
 * httpOnly, `SameSite=Lax`, solo para `/usuarios` y de 120 segundos. El
 * proxy la mueve a `CABECERA_AVISO` y la borra en la misma respuesta, en la
 * unica peticion que trae ese token, asi que recargar o volver atras ya no
 * encuentra nada que anunciar —con o sin JavaScript—.
 *
 * Es la misma forma del mecanismo de la contrasenia temporal; la explicacion
 * de Next que la obliga esta en `avisoEnTransito.ts`.
 */
const VIGENCIA_EN_SEGUNDOS = 120;

export const guardarAvisoPendiente = async (
  datos: Omit<AvisoPendiente, "token">,
): Promise<AvisoPendiente> => {
  const aviso: AvisoPendiente = { token: randomUUID(), ...datos };

  (await cookies()).set(NOMBRE_COOKIE_AVISO, codificarAvisoPendiente(aviso), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV !== "development",
    path: RUTA_COOKIE_AVISO,
    maxAge: VIGENCIA_EN_SEGUNDOS,
  });

  return aviso;
};

/**
 * Guardar el aviso es lo unico que puede fallar **despues** de que la baja
 * ocurrio: si la cookie no se escribe, la operadora se queda sin el aviso y
 * la cuenta ya no entra. Devolver `null` deja que la accion vuelva al
 * listado —donde el estado se ve igual— en vez de terminar en un 500.
 */
export const intentarGuardarAvisoPendiente = async (
  datos: Omit<AvisoPendiente, "token">,
): Promise<AvisoPendiente | null> => {
  try {
    return await guardarAvisoPendiente(datos);
  } catch (error) {
    console.error("[usuarios] aviso de la baja", datosSegurosDeError(error));

    return null;
  }
};

/** Sin token en la URL no se lee nada: ninguna otra visita lo anuncia. */
export const avisoPendienteDeLaPeticion = async (
  token: string | undefined,
): Promise<AvisoPendiente | null> => {
  if (!token) return null;
  const aviso = decodificarAvisoPendiente(
    (await headers()).get(CABECERA_AVISO) ?? undefined,
  );

  return aviso?.token === token ? aviso : null;
};

/** Solo la borra si el token es el suyo: otra visita no toca esta cookie. */
export const descartarAvisoPendiente = async (token: string): Promise<void> => {
  const almacen = await cookies();
  const guardado = decodificarAvisoPendiente(
    almacen.get(NOMBRE_COOKIE_AVISO)?.value,
  );
  if (guardado?.token !== token) return;

  almacen.delete({ name: NOMBRE_COOKIE_AVISO, path: RUTA_COOKIE_AVISO });
};
