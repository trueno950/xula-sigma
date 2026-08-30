"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { emitirConstancia } from "../../composicion";
import {
  DocumentosNoConfiguradosError,
  SinResidenciaVigenteError,
  TitularDadoDeBajaError,
} from "../../domain";

/**
 * Borde de sesion de la emision. Formulario nativo sin `use client`: la
 * excepcion de `AGENTS.md`, seccion Server Actions. Solo la forma del dato
 * se valida aca; las precondiciones de negocio (bloque de firma, residencia
 * vigente, titular activo) las decide `emitirConstancia`, no esta accion
 * (spec `emision-de-constancias`: "Bloqueo de emision sin bloque de firma
 * configurado" y "Bloqueo de emision sin residencia vigente").
 */

const esquemaDeEntrada = z.object({
  personaId: z.string().trim().uuid(),
});

const MENSAJE_FORMULARIO_INVALIDO = "No se reconoce la persona a emitir.";
const MENSAJE_GENERICO = "No se pudo emitir la constancia. Intente de nuevo.";

const redirigirAConstanciasConError = (mensaje: string): never =>
  redirect(`/constancias?error=${encodeURIComponent(mensaje)}`);

const redirigirAEmisionConError = (personaId: string, mensaje: string): never =>
  redirect(
    `/constancias/emitir?personaId=${personaId}&error=${encodeURIComponent(mensaje)}`,
  );

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  // Persona inexistente o de otro tenant: mismo criterio que
  // `registrarMudanzaAction`, 404 y no 403.
  if (error instanceof NoEncontradoError) return "Esa persona no existe.";
  if (error instanceof TitularDadoDeBajaError) return error.message;
  if (error instanceof SinResidenciaVigenteError) return error.message;
  if (error instanceof DocumentosNoConfiguradosError) return error.message;

  console.error("[constancias] emision fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function emitirConstanciaAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    personaId: formData.get("personaId"),
  });

  if (!analisis.success) {
    redirigirAConstanciasConError(MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const { personaId } = analisis.data;
  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  let id: string;

  try {
    id = await emitirConstancia(personaId, contexto);
  } catch (error) {
    redirigirAEmisionConError(personaId, mensajeDeError(error));
    return;
  }

  revalidatePath("/constancias");
  redirect(`/constancias/${id}`);
}
