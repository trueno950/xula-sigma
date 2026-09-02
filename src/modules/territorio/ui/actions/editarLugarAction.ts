"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { editarLugar } from "../../composicion";
import { comoLugarId } from "../../domain";
import { volverAlArbol } from "./volverAlArbol";

/** Mismo reparto que `altaDeLugarAction`. Formulario nativo sin `use client`. */

const esquemaDeEntrada = z.object({
  id: z.string().trim().uuid(),
  nombre: z.string().trim().min(1),
  raiz: z.string().trim().uuid().optional(),
  nodo: z.string().trim().uuid().optional(),
});
const MENSAJE_FORMULARIO_INVALIDO = "El nombre es obligatorio.";
const MENSAJE_GENERICO = "No se pudo completar la edicion. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;

  console.error(
    "[territorio] edicion de lugar fallo",
    datosSegurosDeError(error),
  );

  return MENSAJE_GENERICO;
};

export async function editarLugarAction(formData: FormData): Promise<void> {
  const raiz = formData.get("raiz")?.toString() || undefined;
  const nodo = formData.get("nodo")?.toString() || undefined;
  const analisis = esquemaDeEntrada.safeParse({
    id: formData.get("id"),
    nombre: formData.get("nombre"),
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
    await editarLugar(
      { id: comoLugarId(analisis.data.id), nombre: analisis.data.nombre },
      contexto,
    );
  } catch (error) {
    volverAlArbol(raiz, nodo, mensajeDeError(error));
  }

  revalidatePath("/territorio");
}
