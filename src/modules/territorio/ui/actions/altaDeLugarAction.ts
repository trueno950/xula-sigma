"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { altaDeLugar } from "../../composicion";
import {
  comoLugarId,
  JerarquiaInvalidaError,
  TIPOS_DE_LUGAR,
} from "../../domain";

/**
 * Borde de sesion del alta (mismo reparto que `altaDePersonaAction`,
 * `padron`). Formulario nativo sin `use client`: la excepcion de
 * `AGENTS.md`, seccion Server Actions.
 */

const esquemaDeEntrada = z.object({
  tipo: z.enum(TIPOS_DE_LUGAR),
  nombre: z.string().trim().min(1),
  padreId: z.union([z.literal(""), z.string().trim().uuid()]),
});

const MENSAJE_FORMULARIO_INVALIDO = "Tipo y nombre son obligatorios.";
const MENSAJE_GENERICO = "No se pudo completar el alta. Intente de nuevo.";

const redirigirConError = (mensaje: string): never =>
  redirect(`/territorio?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  // padreId inexistente: puede pasar aunque el FK compuesto de Postgres lo
  // bloquee, si `padreId` referencia un lugar de otro tenant que RLS ya
  // esconde antes de llegar al FK (altaDeLugar.ts).
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof JerarquiaInvalidaError) return error.message;

  console.error("[territorio] alta de lugar fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function altaDeLugarAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    tipo: formData.get("tipo"),
    nombre: formData.get("nombre"),
    padreId: formData.get("padreId") ?? "",
  });

  if (!analisis.success) {
    redirigirConError(MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await altaDeLugar(
      {
        tipo: analisis.data.tipo,
        nombre: analisis.data.nombre,
        padreId: analisis.data.padreId
          ? comoLugarId(analisis.data.padreId)
          : null,
      },
      contexto,
    );
  } catch (error) {
    redirigirConError(mensajeDeError(error));
  }

  revalidatePath("/territorio");
  redirect("/territorio");
}
