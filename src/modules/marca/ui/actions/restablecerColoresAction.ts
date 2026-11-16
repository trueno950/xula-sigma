"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { restablecerColores } from "../../composicion";
import { MENSAJES_DE_ERROR_DE_MARCA } from "../mensajesDeMarca";
import { confirmarEnMarca, volverAMarca } from "./navegacionDeMarca";

/**
 * Volver a los colores por defecto de XULA (S5).
 *
 * Formulario nativo sin `use client`, misma excepcion de AGENTS.md que el
 * alta de colores y las mismas oraciones de `mensajesDeMarca.ts` (S8).
 *
 * `ambito` es el unico campo y es cerrado: dice que se restablece. El dia
 * que `/marca` tenga un segundo boton de restablecer —el escudo, por
 * ejemplo— un formulario viejo en una pestana abierta no puede terminar
 * disparando el otro.
 */

const esquemaDeEntrada = z.object({ ambito: z.literal("colores") });

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) {
    return MENSAJES_DE_ERROR_DE_MARCA.sinPermiso;
  }

  console.error(
    "[marca] restablecimiento de colores fallo",
    datosSegurosDeError(error),
  );

  return MENSAJES_DE_ERROR_DE_MARCA.restablecimientoFallido;
};

export async function restablecerColoresAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    ambito: formData.get("ambito"),
  });

  if (!analisis.success) {
    return volverAMarca(MENSAJES_DE_ERROR_DE_MARCA.restablecimientoFallido);
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await restablecerColores(contexto);
  } catch (error) {
    volverAMarca(mensajeDeError(error));
  }

  revalidatePath("/marca");

  confirmarEnMarca("colores-restablecidos");
}
