"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { quitarEscudo } from "../../composicion";
import { QuitarEscudoSinConfirmarError } from "../../domain";
import type { ClaveDeErrorDeMarca } from "../mensajesDeMarca";
import { confirmarEnMarca, volverAMarca } from "./navegacionDeMarca";

/**
 * Quitar el escudo del municipio (S7).
 *
 * Formulario nativo sin `use client`, misma excepcion de `AGENTS.md` que la
 * subida y el restablecimiento: sin JavaScript el navegador manda el POST
 * entero y el rechazo no puede volver como `ActionResult` porque no hay
 * componente cliente que lo lea. Viaja como **codigo** en la URL y la pantalla
 * lo traduce (S4): nunca el texto de la excepcion.
 *
 * `ambito` es un campo cerrado que dice que se quita, igual que en el
 * restablecimiento: el dia que `/marca` tenga un segundo «quitar», un
 * formulario viejo en una pestana abierta no puede terminar borrando el
 * escudo.
 *
 * La casilla se exige **antes** del caso de uso, asi que sin ella no se
 * escribe la fila ni se toca el objeto guardado. Y no basta con esconder el
 * boton cuando no hay escudo: un POST a mano sigue llegando, y el caso de uso
 * lo resuelve sin error porque no hay nada que quitar.
 */

const esquemaDeEntrada = z.object({ ambito: z.literal("escudo") });

const exigirConfirmacion = (valor: unknown): void => {
  if (valor !== "si") throw new QuitarEscudoSinConfirmarError();
};

const claveDelFallo = (error: unknown): ClaveDeErrorDeMarca => {
  if (error instanceof NoAutorizadoError) return "sin-permiso";

  if (error instanceof QuitarEscudoSinConfirmarError) {
    return "quitar-sin-confirmar";
  }

  console.error(
    "[marca] el escudo no se pudo quitar",
    datosSegurosDeError(error),
  );

  return "escudo-no-quitado";
};

export async function quitarEscudoAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    ambito: formData.get("ambito"),
  });

  if (!analisis.success) {
    return volverAMarca("escudo-no-quitado");
  }

  // El ayuntamiento y el rol salen del contexto de sesion, nunca de
  // `formData`: un Server Action es superficie publica.
  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    exigirConfirmacion(formData.get("confirmar"));
    await quitarEscudo(contexto);
  } catch (error) {
    volverAMarca(claveDelFallo(error));
  }

  revalidatePath("/marca");
  // El escudo vive tambien en la banda del municipio de `/acceso` y del
  // layout del panel: sin esta segunda invalidacion, la banda sigue pintando
  // el escudo que se acaba de quitar.
  revalidatePath("/acceso");

  confirmarEnMarca("escudo-quitado");
}
