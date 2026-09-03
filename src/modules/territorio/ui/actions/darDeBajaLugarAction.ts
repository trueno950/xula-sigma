"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { darDeBajaLugar } from "../../composicion";
import { comoLugarId, LugarConDependientesError } from "../../domain";
import { irAlArbol, navegacionDe, volverAlArbol } from "./volverAlArbol";

/** Mismo reparto que `altaDeLugarAction`. Formulario nativo sin `use client`. */

const esquemaDeEntrada = z.object({
  id: z.string().trim().uuid(),
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
  const analisis = esquemaDeEntrada.safeParse({
    id: formData.get("id"),
  });

  const { raiz, nodo } = navegacionDe(formData);
  const padre = formData.get("padre")?.toString() || undefined;

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

  // El nodo abierto es justo el que se dio de baja, asi que la URL actual
  // ya no resuelve: se sube al padre. Dando de baja la raiz misma no queda
  // arbol que abrir y el destino es el listado.
  irAlArbol(nodo === raiz ? undefined : raiz, padre);
}
