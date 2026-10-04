"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { darDeBajaCalle } from "../../composicion";
import { CalleConDomiciliosError, comoCalleId } from "../../domain";
import { irAlArbol, navegacionDe, volverAlArbol } from "./volverAlArbol";

const esquemaDeEntrada = z.object({
  calleId: z.string().trim().uuid(),
});
const MENSAJE_FORMULARIO_INVALIDO = "Falta la calle a dar de baja.";
const MENSAJE_GENERICO = "No se pudo completar la baja. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof CalleConDomiciliosError) return error.message;

  console.error("[territorio] baja de calle fallo", datosSegurosDeError(error));
  return MENSAJE_GENERICO;
};

export async function darDeBajaCalleAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    calleId: formData.get("calleId"),
  });
  const navegacion = navegacionDe(formData);
  if (!analisis.success) {
    volverAlArbol(navegacion, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();
  if (!contexto) redirect("/acceso");

  try {
    await darDeBajaCalle(comoCalleId(analisis.data.calleId), contexto);
  } catch (error) {
    volverAlArbol(navegacion, mensajeDeError(error));
  }

  revalidatePath("/territorio");
  irAlArbol(undefined, undefined, "calle-baja");
}
