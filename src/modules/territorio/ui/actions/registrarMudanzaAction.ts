"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { registrarMudanza } from "../../composicion";
import { comoDomicilioId } from "../../domain";

/** Mismo reparto que `altaDeDomicilioAction`. Formulario nativo sin `use client`. */

const esquemaDeEntrada = z.object({
  personaId: z.string().trim().uuid(),
  domicilioId: z.string().trim().uuid(),
});

const MENSAJE_FORMULARIO_INVALIDO = "Persona y domicilio son obligatorios.";
const MENSAJE_GENERICO = "No se pudo completar la mudanza. Intente de nuevo.";

const redirigirAlPadronConError = (mensaje: string): never =>
  redirect(`/padron?error=${encodeURIComponent(mensaje)}`);

const redirigirAlDetalleConError = (
  personaId: string,
  mensaje: string,
): never =>
  redirect(`/padron/${personaId}?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  // terminalDe null (persona inexistente/de otro tenant) o domicilioId de
  // otro tenant/inexistente: los dos 404, nunca 403 (registrarMudanza.ts).
  if (error instanceof NoEncontradoError) return error.message;

  console.error("[territorio] mudanza fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function registrarMudanzaAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    personaId: formData.get("personaId"),
    domicilioId: formData.get("domicilioId"),
  });

  if (!analisis.success) {
    redirigirAlPadronConError(MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const { personaId, domicilioId } = analisis.data;
  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await registrarMudanza(personaId, comoDomicilioId(domicilioId), contexto);
  } catch (error) {
    redirigirAlDetalleConError(personaId, mensajeDeError(error));
  }

  revalidatePath(`/padron/${personaId}`);
  redirect(`/padron/${personaId}`);
}
