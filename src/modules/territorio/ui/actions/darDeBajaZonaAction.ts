"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { darDeBajaZona } from "../../composicion";
import { comoZonaId } from "../../domain";
import {
  confirmarEnZonas,
  volverAZonas,
  zonaDeNavegacion,
} from "./navegacionDeZonas";

/** Formulario nativo sin `use client` (excepcion de AGENTS.md). */

const esquemaDeEntrada = z.object({ zonaId: z.string().trim().uuid() });
const MENSAJE_FORMULARIO_INVALIDO = "Falta la zona a dar de baja.";
const MENSAJE_GENERICO = "No se pudo dar de baja la zona. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;

  console.error("[territorio] baja de zona fallo", datosSegurosDeError(error));
  return MENSAJE_GENERICO;
};

export async function darDeBajaZonaAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    zonaId: formData.get("zonaId"),
  });

  if (!analisis.success) {
    volverAZonas(zonaDeNavegacion(formData), MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();
  if (!contexto) redirect("/acceso");

  try {
    await darDeBajaZona(comoZonaId(analisis.data.zonaId), contexto);
  } catch (error) {
    volverAZonas(analisis.data.zonaId, mensajeDeError(error));
  }

  revalidatePath("/territorio/zonas");
  // La baja mueve a la operadora: la zona de la URL deja de existir.
  confirmarEnZonas(undefined, "zona-baja");
}
