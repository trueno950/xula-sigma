import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import {
  type ClaveMostrada,
  codificarClaveMostrada,
  decodificarClaveMostrada,
} from "./claveMostrada";
import {
  CABECERA_CLAVE_MOSTRADA,
  NOMBRE_COOKIE_CLAVE_MOSTRADA,
  RUTA_COOKIE_CLAVE_MOSTRADA,
} from "./claveMostradaEnTransito";

/**
 * Donde vive la contrasenia temporal entre la accion que la genera y la
 * pantalla que la muestra una sola vez (S4: «No viaja en la URL ni queda en
 * los logs»).
 *
 * **En la URL no puede ir**: quedaria en el historial del navegador y en el
 * log de accesos del servidor, que es exactamente lo que la decision
 * prohibe. Va en una cookie httpOnly, `SameSite=Lax`, solo para `/usuarios`
 * y de 120 segundos. La URL lleva unicamente el token, y la pantalla la
 * aplica solo si coincide: cualquier otra navegacion no la muestra.
 *
 * **La consumen el proxy y la isla.** Un Server Component
 * lee cookies pero no las borra, y sin JavaScript no hay Server Function
 * que las borre despues de pintar: la primera recarga volvia a mostrar la
 * clave (S2). El proxy la mueve a `CABECERA_CLAVE_MOSTRADA` y la borra en
 * la misma respuesta, en la unica peticion que trae el token; de ahi en
 * adelante la cookie ya no existe. El camino con JavaScript -que la clave
 * sobreviva hasta que la pide la isla- y la limpieza de la URL estan
 * explicados una sola vez: `AGENTS.md`, nota de `usuarios`. El traslado y
 * los nombres compartidos viven en `claveMostradaEnTransito.ts`.
 *
 * Las dos acciones que escriben esta cookie son un `<form>` nativo que
 * redirige, la excepcion de `AGENTS.md` en la seccion Server Actions. La
 * que la borra cuando la operadora dice que ya la anoto tambien.
 */
const VIGENCIA_EN_SEGUNDOS = 120;

export const guardarClaveMostrada = async (
  datos: Omit<ClaveMostrada, "token">,
): Promise<ClaveMostrada> => {
  const mostrada: ClaveMostrada = { token: randomUUID(), ...datos };

  (await cookies()).set(
    NOMBRE_COOKIE_CLAVE_MOSTRADA,
    codificarClaveMostrada(mostrada),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV !== "development",
      path: RUTA_COOKIE_CLAVE_MOSTRADA,
      maxAge: VIGENCIA_EN_SEGUNDOS,
    },
  );

  return mostrada;
};

/**
 * Guardar la clave es lo unico que puede fallar **despues** de que la
 * cuenta quedo creada o restablecida: si la cookie no se escribe, la
 * operadora se queda sin la contrasenia que el sistema acaba de generar y
 * la cuenta existe igual. Devolver `null` deja que la accion lo redacte con
 * su propio codigo en vez de terminar en un 500 que no dice nada.
 */
export const intentarGuardarClaveMostrada = async (
  datos: Omit<ClaveMostrada, "token">,
): Promise<ClaveMostrada | null> => {
  try {
    return await guardarClaveMostrada(datos);
  } catch (error) {
    console.error("[usuarios] clave mostrada", datosSegurosDeError(error));

    return null;
  }
};

/** La clave de esta peticion, solo si el token coincide con el guardado. */
const claveGuardadaDe = async (
  token: string | undefined,
): Promise<ClaveMostrada | null> => {
  if (!token) return null;
  const guardada = decodificarClaveMostrada(
    (await cookies()).get(NOMBRE_COOKIE_CLAVE_MOSTRADA)?.value,
  );

  return guardada?.token === token ? guardada : null;
};

/** Sin token en la URL no se lee nada: ninguna otra visita la muestra. */
export const claveMostradaDeLaPeticion = async (
  token: string | undefined,
): Promise<ClaveMostrada | null> => {
  if (!token) return null;
  const mostrada = decodificarClaveMostrada(
    (await headers()).get(CABECERA_CLAVE_MOSTRADA) ?? undefined,
  );

  return mostrada?.token === token ? mostrada : null;
};

/** Solo la borra si el token es el suyo: otra visita no toca esta cookie. */
export const descartarClaveMostrada = async (token: string): Promise<void> => {
  if (!(await claveGuardadaDe(token))) return;

  (await cookies()).delete({
    name: NOMBRE_COOKIE_CLAVE_MOSTRADA,
    path: RUTA_COOKIE_CLAVE_MOSTRADA,
  });
};

/**
 * La clave que el `POST /usuarios/clave-temporal` le entrega a la isla (S4 de
 * `usuarios-seguridad`), **borrando la cookie en el mismo viaje**: la primera
 * peticion se la lleva y la segunda ya no encuentra nada.
 *
 * Es la unica salida de la clave hacia el cliente con JavaScript: el payload
 * de la pantalla no la lleva, por eso el router no puede volver a pintarla al
 * regresar con «Atras» sin preguntarle al servidor.
 */
export const tomarClaveMostrada = async (
  token: string,
): Promise<ClaveMostrada | null> => {
  const guardada = await claveGuardadaDe(token);
  if (!guardada) return null;

  await descartarClaveMostrada(token);

  return guardada;
};

/**
 * El `usuarioId` de la clave que esta peticion **todavia puede pedir**, o
 * `null` si ya no hay ninguna.
 *
 * Lee la cookie sin consumirla y **sin devolver la clave**: la pantalla solo
 * necesita saber de quien era para armar la tarjeta, y lo que no sale de aca
 * no puede quedar en el payload del router. Que la clave este todavia en el
 * navegador significa que el proxy no la consumio, es decir que la peticion
 * es la del router y no una navegacion de documento (`claveMostradaEnTransito.ts`).
 */
export const clavePorPedirDeLaPeticion = async (
  token: string | undefined,
): Promise<string | null> => (await claveGuardadaDe(token))?.usuarioId ?? null;
