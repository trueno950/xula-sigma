"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { renombrarCalle } from "../../composicion";
import { comoCalleId, NombreDeCalleDuplicadoError } from "../../domain";
import { volverAlArbol } from "./volverAlArbol";

/** Mismo reparto que `editarLugarAction`. Formulario nativo sin `use client`. */

const esquemaDeEntrada = z.object({
  id: z.string().trim().uuid(),
  nombre: z.string().trim().min(1),
  raiz: z.string().trim().uuid().optional(),
  nodo: z.string().trim().uuid().optional(),
});
const MENSAJE_FORMULARIO_INVALIDO =
  "Seleccione una calle y escriba el nombre nuevo.";
const MENSAJE_GENERICO = "No se pudo completar el renombre. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof NombreDeCalleDuplicadoError) return error.message;

  console.error(
    "[territorio] renombre de calle fallo",
    datosSegurosDeError(error),
  );

  return MENSAJE_GENERICO;
};

export async function renombrarCalleAction(formData: FormData): Promise<void> {
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
    await renombrarCalle(
      comoCalleId(analisis.data.id),
      analisis.data.nombre,
      contexto,
    );
  } catch (error) {
    volverAlArbol(raiz, nodo, mensajeDeError(error));
  }

  revalidatePath("/territorio");
}
