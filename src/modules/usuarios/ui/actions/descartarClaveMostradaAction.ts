"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { descartarClaveMostrada } from "../claveTemporalEnCookie";
import { rutaDeUsuarios } from "./destinoDeUsuarios";

/**
 * El `<form>` de «Ya la anoté» en `AvisoDeClaveTemporal` (S9 de
 * `usuarios-ux`): la operadora dice que anoto la contrasenia, la cookie se
 * borra y la pantalla vuelve al listado **sin el token en la URL**, asi que
 * recargar o volver atras no la muestra otra vez.
 *
 * El token viaja en un campo oculto y no en la URL, y la cookie solo se borra
 * si coincide con la guardada: `descartarClaveMostrada` compara los dos.
 *
 * Es un formulario nativo, la excepcion de `AGENTS.md` para las Server
 * Actions de formulario nativo: no devuelve `ActionResult<T>` porque nadie
 * podria leerlo. Al volver al listado limpio no hay confirmacion que dar —la
 * operadora acaba de decir que ya la anoto— y por eso el destino no lleva
 * `ok`.
 */
const esquemaDeEntrada = z.string().trim().uuid();

export async function descartarClaveMostradaAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse(formData.get("token"));

  if (analisis.success) {
    try {
      await descartarClaveMostrada(analisis.data);
    } catch (error) {
      // La cookie vence sola a los 120 segundos y el `POST` del montaje
      // (`DescartarClaveAlMostrar`) la borra por la otra via: el fallo no
      // cambia lo que ve la operadora, pero queda en el log.
      console.error("[usuarios] clave mostrada", datosSegurosDeError(error));
    }
  }

  redirect(rutaDeUsuarios({}));
}
