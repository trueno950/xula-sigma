"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { darDeBajaLugar } from "../../composicion";
import { comoLugarId, LugarConDependientesError } from "../../domain";
import { volverAlArbol } from "./volverAlArbol";

/** Mismo reparto que `altaDeLugarAction`. Formulario nativo sin `use client`. */

const esquemaDeEntrada = z.object({
  id: z.string().trim().uuid(),
  raiz: z.string().trim().uuid().optional(),
  nodo: z.string().trim().uuid().optional(),
});

const MENSAJE_FORMULARIO_INVALIDO = "Falta el lugar a dar de baja.";
const MENSAJE_GENERICO = "No se pudo completar la baja. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof LugarConDependientesError) return error.message;

  console.error("[territorio] baja de lugar fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function darDeBajaLugarAction(formData: FormData): Promise<void> {
  const raiz = formData.get("raiz")?.toString() || undefined;
  const nodo = formData.get("nodo")?.toString() || undefined;
  const analisis = esquemaDeEntrada.safeParse({
    id: formData.get("id"),
    raiz: formData.get("raiz")?.toString() || undefined,
    nodo: formData.get("nodo")?.toString() || undefined,
  });

  if (!analisis.success) {
    volverAlArbol(raiz, nodo, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await darDeBajaLugar(comoLugarId(analisis.data.id), contexto);
  } catch (error) {
    volverAlArbol(raiz, nodo, mensajeDeError(error));
  }

  revalidatePath("/territorio");
}
