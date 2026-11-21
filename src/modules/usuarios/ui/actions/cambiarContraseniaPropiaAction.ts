"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CambioDeClaveVencidoError,
  ClaveRepetidaError,
  cambiarClavePropia,
  contextoDeCambioDeClave,
} from "@/shared/auth";
import { ClaveDebilError } from "@/shared/auth/contrasenia";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import {
  type CodigoDeCambioDeClave,
  rutaDeCambioDeClave,
} from "../mensajesDeCambioDeClave";

/**
 * S2: la persona que entro con una temporal elige la suya. `<form>` nativo y
 * `redirect` con el codigo del error —la excepcion a `ActionResult<T>` que
 * documenta `AGENTS.md`—, asi que funciona igual sin JavaScript, que es como
 * entra la operadora rural de `PRODUCT.md`.
 *
 * **No recibe el usuario ni el tenant de nadie**: los resuelve
 * `contextoDeCambioDeClave()` del servidor, que ademas exige que la cuenta
 * siga con la temporal puesta. Un POST a mano sin sesion no cambia nada.
 *
 * La clave no viaja en la URL ni en el log: solo el codigo del rechazo.
 */

const esquemaDeEntrada = z.object({
  nueva: z.string(),
  repetida: z.string(),
});

const volverCon = (codigo: CodigoDeCambioDeClave): never =>
  redirect(rutaDeCambioDeClave(codigo));

/**
 * La lista blanca del error a codigo. Lo que no esta cae en el generico y
 * deja su traza en el log: un error de Postgres tambien es `Error` y su
 * `.message` no esta escrito para nadie.
 */
function codigoDel(error: unknown): CodigoDeCambioDeClave {
  if (error instanceof ClaveDebilError) return "corta";
  if (error instanceof ClaveRepetidaError) return "repetida";

  /**
   * Otra pestana gano la carrera, o la sesion se cerro: no es una falla y el
   * mensaje generico ya invita a reintentar. Sin traza en el log para no
   * llenarlo de carreras normales.
   */
  if (error instanceof CambioDeClaveVencidoError) return "generico";

  console.error(
    "[auth] cambio de contrasenia fallo",
    datosSegurosDeError(error),
  );

  return "generico";
}

export async function cambiarContraseniaPropiaAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    nueva: formData.get("nueva"),
    repetida: formData.get("repetida"),
  });

  // El `return` explicito no es adorno: `redirect` esta tipada `never` pero
  // TypeScript no angosta `analisis` a traves de la llamada (mismo caso que
  // `padron/ui/actions/altaDePersona.action.ts`, `zod@4.4.3`).
  if (!analisis.success) {
    volverCon("no-coincide");
    return;
  }

  const { nueva, repetida } = analisis.data;

  if (nueva !== repetida) {
    volverCon("no-coincide");
    return;
  }

  const contexto = await contextoDeCambioDeClave();

  if (!contexto) redirect("/acceso");

  try {
    await cambiarClavePropia(contexto, nueva);
  } catch (error) {
    volverCon(codigoDel(error));
    return;
  }

  redirect("/");
}
