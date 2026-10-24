"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { altaDeZona } from "../../composicion";
import { comoLugarId, NombreDeZonaDuplicadoError } from "../../domain";
import {
  confirmarEnZonas,
  volverAZonas,
  zonaDeNavegacion,
} from "./navegacionDeZonas";

/** Formulario nativo sin `use client` (excepcion de AGENTS.md). */

const esquemaDeEntrada = z.object({
  nombre: z.string().trim().min(1),
  lugarId: z.string().trim().uuid(),
});
const MENSAJE_FORMULARIO_INVALIDO =
  "Escriba el nombre de la zona y elija su asentamiento.";
const MENSAJE_GENERICO = "No se pudo crear la zona. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof NombreDeZonaDuplicadoError) return error.message;

  console.error("[territorio] alta de zona fallo", datosSegurosDeError(error));
  return MENSAJE_GENERICO;
};

export async function altaDeZonaAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    nombre: formData.get("nombre"),
    lugarId: formData.get("lugarId"),
  });

  if (!analisis.success) {
    volverAZonas(undefined, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();
  if (!contexto) redirect("/acceso");

  try {
    await altaDeZona(
      {
        nombre: analisis.data.nombre,
        lugarId: comoLugarId(analisis.data.lugarId),
      },
      contexto,
    );
  } catch (error) {
    volverAZonas(zonaDeNavegacion(formData), mensajeDeError(error));
  }

  revalidatePath("/territorio/zonas");
  confirmarEnZonas(undefined, "zona-alta");
}
