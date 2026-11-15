"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, ValidacionError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { cambiarColores } from "../../composicion";
import { MENSAJES_DE_ERROR_DE_MARCA } from "../mensajesDeMarca";
import { colorElegido } from "../seleccionDeColor";
import { confirmarEnMarca, volverAMarca } from "./navegacionDeMarca";

/**
 * Guardar los colores del municipio (S1-S3).
 *
 * Formulario nativo sin `use client` (excepcion de AGENTS.md): el error
 * viaja por `redirect` + `?error=`, con una oracion de
 * `mensajesDeMarca.ts` y nunca el texto de la excepcion (S8).
 *
 * Lo unico que valida el esquema es que haya dos colores: el formato, la
 * medibilidad y el contraste los decide `validarMarca` adentro del caso de
 * uso, que es la misma reja que protege al escudo.
 */

const esquemaDeEntrada = z.object({
  primario: z.string().trim().min(1),
  secundario: z.string().trim().min(1),
});

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) {
    return MENSAJES_DE_ERROR_DE_MARCA.sinPermiso;
  }

  if (error instanceof ValidacionError) {
    return MENSAJES_DE_ERROR_DE_MARCA.colorInvalido;
  }

  console.error("[marca] cambio de colores fallo", datosSegurosDeError(error));

  return MENSAJES_DE_ERROR_DE_MARCA.guardadoFallido;
};

export async function cambiarColoresAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    primario: colorElegido(formData, "primario"),
    secundario: colorElegido(formData, "secundario"),
  });

  if (!analisis.success) {
    return volverAMarca(MENSAJES_DE_ERROR_DE_MARCA.formularioIncompleto);
  }

  // Ni el ayuntamiento ni el rol salen del formulario: un Server Action es
  // superficie publica y el contexto lo resuelve el servidor.
  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await cambiarColores(analisis.data, contexto);
  } catch (error) {
    volverAMarca(mensajeDeError(error));
  }

  revalidatePath("/marca");

  confirmarEnMarca("colores-guardados");
}
