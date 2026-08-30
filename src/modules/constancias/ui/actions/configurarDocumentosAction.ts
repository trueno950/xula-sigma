"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, ValidacionError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { configurarDocumentos } from "../../composicion";

/**
 * Borde de sesion del alta del bloque de firma. Formulario nativo sin
 * `use client`: la excepcion de `AGENTS.md`, seccion Server Actions. Solo
 * la forma del dato se valida aca; el minimo/maximo de cada campo lo
 * valida `validarDocumentos` mas adentro, sobre el resultado compuesto
 * (design.md de `constancias-oficios`, decision 8).
 */

const esquemaDeEntrada = z.object({
  firmanteNombre: z.string().trim().min(1),
  firmanteCargo: z.string().trim().min(1),
  leyendaDePie: z.string().trim(),
});

const MENSAJE_FORMULARIO_INVALIDO = "Nombre y cargo son obligatorios.";
const MENSAJE_GENERICO =
  "No se pudo guardar el bloque de firma. Intente de nuevo.";

const redirigirConError = (mensaje: string): never =>
  redirect(`/constancias/configuracion?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof ValidacionError)
    return Object.values(error.campos)[0] ?? error.message;

  console.error(
    "[constancias] configuracion de documentos fallo",
    datosSegurosDeError(error),
  );

  return MENSAJE_GENERICO;
};

export async function configurarDocumentosAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    firmanteNombre: formData.get("firmanteNombre"),
    firmanteCargo: formData.get("firmanteCargo"),
    leyendaDePie: formData.get("leyendaDePie") ?? "",
  });

  if (!analisis.success) {
    redirigirConError(MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  const campos: Record<string, unknown> = {
    firmanteNombre: analisis.data.firmanteNombre,
    firmanteCargo: analisis.data.firmanteCargo,
  };

  if (analisis.data.leyendaDePie)
    campos.leyendaDePie = analisis.data.leyendaDePie;

  try {
    await configurarDocumentos(campos, contexto);
  } catch (error) {
    redirigirConError(mensajeDeError(error));
  }

  revalidatePath("/constancias/configuracion");
  redirect("/constancias/configuracion");
}
