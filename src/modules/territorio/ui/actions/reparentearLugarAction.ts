"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { reparentearLugar } from "../../composicion";
import { comoLugarId, JerarquiaInvalidaError } from "../../domain";

/** Mismo reparto que `altaDeLugarAction`. Formulario nativo sin `use client`. */

const esquemaDeEntrada = z.object({
  lugarId: z.string().trim().uuid(),
  nuevoPadreId: z.union([z.literal(""), z.string().trim().uuid()]),
});

const MENSAJE_FORMULARIO_INVALIDO = "Falta el lugar a mover.";
const MENSAJE_GENERICO =
  "No se pudo completar el reparenteo. Intente de nuevo.";

const redirigirConError = (mensaje: string): never =>
  redirect(`/territorio?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof JerarquiaInvalidaError) return error.message;

  console.error("[territorio] reparenteo fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function reparentearLugarAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    lugarId: formData.get("lugarId"),
    nuevoPadreId: formData.get("nuevoPadreId") ?? "",
  });

  if (!analisis.success) {
    redirigirConError(MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await reparentearLugar(
      comoLugarId(analisis.data.lugarId),
      analisis.data.nuevoPadreId
        ? comoLugarId(analisis.data.nuevoPadreId)
        : null,
      contexto,
    );
  } catch (error) {
    redirigirConError(mensajeDeError(error));
  }

  revalidatePath("/territorio");
  redirect("/territorio");
}
