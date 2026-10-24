"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { renombrarZona } from "../../composicion";
import { comoZonaId, NombreDeZonaDuplicadoError } from "../../domain";
import {
  confirmarEnZonas,
  volverAZonas,
  zonaDeNavegacion,
} from "./navegacionDeZonas";

/** Formulario nativo sin `use client` (excepcion de AGENTS.md). */

const esquemaDeEntrada = z.object({
  zonaId: z.string().trim().uuid(),
  nombre: z.string().trim().min(1),
});
const MENSAJE_FORMULARIO_INVALIDO =
  "Seleccione una zona y escriba el nombre nuevo.";
const MENSAJE_GENERICO = "No se pudo renombrar la zona. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof NombreDeZonaDuplicadoError) return error.message;

  console.error(
    "[territorio] renombre de zona fallo",
    datosSegurosDeError(error),
  );
  return MENSAJE_GENERICO;
};

export async function renombrarZonaAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    zonaId: formData.get("zonaId"),
    nombre: formData.get("nombre"),
  });

  if (!analisis.success) {
    volverAZonas(zonaDeNavegacion(formData), MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();
  if (!contexto) redirect("/acceso");

  try {
    await renombrarZona(
      comoZonaId(analisis.data.zonaId),
      analisis.data.nombre,
      contexto,
    );
  } catch (error) {
    volverAZonas(analisis.data.zonaId, mensajeDeError(error));
  }

  revalidatePath("/territorio/zonas");
  confirmarEnZonas(analisis.data.zonaId, "zona-renombre");
}
