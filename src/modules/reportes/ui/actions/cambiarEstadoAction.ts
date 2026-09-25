"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import {
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { cambiarEstadoDeReporte } from "../../composicion";
import {
  comoReporteId,
  DuplicadoDeSiMismoError,
  DuplicadoSinOriginalError,
  ESTADOS_DE_REPORTE,
  esFolioDeReporte,
  MOTIVOS_DE_RECHAZO,
  normalizarFolio,
  ReporteCerradoError,
  TransicionInvalidaError,
} from "../../domain";

/**
 * Borde de sesion de la transicion (tasks.md 7.11). Formulario nativo sin
 * `use client`: la excepcion de `AGENTS.md`, seccion Server Actions. Ocultar
 * el boton en `AccionesDeReporte` no es autorizacion; la real vive en
 * `cambiarEstadoDeReporte` (Fase 5), que esta accion invoca sin repetir el
 * chequeo de rol.
 */

const esquemaDeEntrada = z.object({
  id: z.string().trim().uuid(),
  estadoNuevo: z.enum(ESTADOS_DE_REPORTE),
  motivoDeRechazo: z.enum(MOTIVOS_DE_RECHAZO).optional(),
  folioDelOriginal: z
    .string()
    .transform(normalizarFolio)
    .refine(esFolioDeReporte)
    .optional(),
});

const MENSAJE_FORMULARIO_INVALIDO = "Datos de la transicion invalidos.";
const MENSAJE_FOLIO_INVALIDO =
  "El folio del reporte original debe tener la forma REP-2026-000123.";
const MENSAJE_GENERICO = "No se pudo cambiar el estado. Intente de nuevo.";

const redirigirConError = (id: string, mensaje: string): never =>
  redirect(`/reportes/detalle/${id}?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return "Ese reporte no existe.";
  if (error instanceof ReporteCerradoError) return error.message;
  if (error instanceof TransicionInvalidaError) return error.message;
  if (error instanceof DuplicadoSinOriginalError) return error.message;
  if (error instanceof DuplicadoDeSiMismoError) return error.message;
  if (error instanceof ValidacionError) return error.message;

  console.error(
    "[reportes] cambio de estado fallo",
    datosSegurosDeError(error),
  );

  return MENSAJE_GENERICO;
};

export async function cambiarEstadoAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    id: formData.get("id"),
    estadoNuevo: formData.get("estadoNuevo"),
    motivoDeRechazo: formData.get("motivoDeRechazo") || undefined,
    folioDelOriginal: formData.get("folioDelOriginal") || undefined,
  });

  const idCrudo = formData.get("id");
  const idParaRedirigir = typeof idCrudo === "string" ? idCrudo : "";

  if (!analisis.success) {
    const fallaElFolio = analisis.error.issues.some(
      (problema) => problema.path[0] === "folioDelOriginal",
    );
    redirigirConError(
      idParaRedirigir,
      fallaElFolio ? MENSAJE_FOLIO_INVALIDO : MENSAJE_FORMULARIO_INVALIDO,
    );
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  const { id, estadoNuevo, motivoDeRechazo, folioDelOriginal } = analisis.data;

  try {
    await cambiarEstadoDeReporte(
      {
        id: comoReporteId(id),
        estadoNuevo,
        motivoDeRechazo: motivoDeRechazo ?? null,
        folioDelOriginal: folioDelOriginal ?? null,
      },
      contexto,
    );
  } catch (error) {
    redirigirConError(id, mensajeDeError(error));
    return;
  }

  revalidatePath(`/reportes/detalle/${id}`);
  redirect(`/reportes/detalle/${id}`);
}
