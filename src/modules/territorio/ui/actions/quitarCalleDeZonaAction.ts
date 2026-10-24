"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { quitarCalleDeZona } from "../../composicion";
import { comoCalleId, comoZonaId } from "../../domain";
import {
  confirmarEnZonas,
  volverAZonas,
  zonaDeNavegacion,
} from "./navegacionDeZonas";

/** Formulario nativo sin `use client` (excepcion de AGENTS.md). */

const esquemaDeEntrada = z.object({
  zonaId: z.string().trim().uuid(),
  calleId: z.string().trim().uuid(),
});
const MENSAJE_FORMULARIO_INVALIDO =
  "Falta la calle que quiere quitar de la zona.";
const MENSAJE_GENERICO = "No se pudo quitar la calle. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;

  console.error(
    "[territorio] quitar calle de zona fallo",
    datosSegurosDeError(error),
  );
  return MENSAJE_GENERICO;
};

export async function quitarCalleDeZonaAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    zonaId: formData.get("zonaId"),
    calleId: formData.get("calleId"),
  });

  if (!analisis.success) {
    volverAZonas(zonaDeNavegacion(formData), MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();
  if (!contexto) redirect("/acceso");

  const ids = {
    zonaId: comoZonaId(analisis.data.zonaId),
    calleId: comoCalleId(analisis.data.calleId),
  };

  try {
    await quitarCalleDeZona(ids, contexto);
  } catch (error) {
    volverAZonas(analisis.data.zonaId, mensajeDeError(error));
  }

  revalidatePath("/territorio/zonas");
  confirmarEnZonas(analisis.data.zonaId, "calle-en-zona-quitada");
}
