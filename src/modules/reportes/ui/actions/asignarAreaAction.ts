"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { asignarAreaDeReporte } from "../../composicion";
import {
  AREAS_RESPONSABLES,
  comoReporteId,
  ReporteCerradoError,
} from "../../domain";

/**
 * Borde de sesion de la asignacion (tasks.md 7.11). Mismo reparto que
 * `cambiarEstadoAction`: formulario nativo sin `use client`, y la
 * autorizacion real vive en `asignarAreaDeReporte` (Fase 5).
 */

const esquemaDeEntrada = z.object({
  id: z.string().trim().uuid(),
  areaResponsable: z.enum(AREAS_RESPONSABLES),
});

const MENSAJE_FORMULARIO_INVALIDO = "Elija un area valida.";
const MENSAJE_GENERICO = "No se pudo asignar el area. Intente de nuevo.";

const redirigirConError = (id: string, mensaje: string): never =>
  redirect(`/reportes/detalle/${id}?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return "Ese reporte no existe.";
  if (error instanceof ReporteCerradoError) return error.message;

  console.error(
    "[reportes] asignacion de area fallo",
    datosSegurosDeError(error),
  );

  return MENSAJE_GENERICO;
};

export async function asignarAreaAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    id: formData.get("id"),
    areaResponsable: formData.get("areaResponsable"),
  });

  const idCrudo = formData.get("id");
  const idParaRedirigir = typeof idCrudo === "string" ? idCrudo : "";

  if (!analisis.success) {
    redirigirConError(idParaRedirigir, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  const { id, areaResponsable } = analisis.data;

  try {
    await asignarAreaDeReporte(
      { id: comoReporteId(id), areaResponsable },
      contexto,
    );
  } catch (error) {
    redirigirConError(id, mensajeDeError(error));
    return;
  }

  revalidatePath(`/reportes/detalle/${id}`);
  redirect(`/reportes/detalle/${id}`);
}
