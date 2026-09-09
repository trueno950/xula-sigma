"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { reparentearCalle } from "../../composicion";
import {
  comoCalleId,
  comoLugarId,
  NombreDeCalleDuplicadoError,
} from "../../domain";
import { irAlArbol, volverAlArbol } from "./volverAlArbol";

const esquemaDeEntrada = z.object({
  calleId: z.string().trim().uuid(),
  nuevoLugarId: z.string().trim().uuid(),
});
const MENSAJE_FORMULARIO_INVALIDO = "Falta la calle o el lugar destino.";
const MENSAJE_GENERICO = "No se pudo mover la calle. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof NombreDeCalleDuplicadoError) return error.message;

  console.error(
    "[territorio] reparenteo de calle fallo",
    datosSegurosDeError(error),
  );
  return MENSAJE_GENERICO;
};

export async function reparentearCalleAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    calleId: formData.get("calleId"),
    nuevoLugarId: formData.get("nuevoLugarId"),
  });
  if (!analisis.success) {
    volverAlArbol(undefined, undefined, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();
  if (!contexto) redirect("/acceso");

  try {
    await reparentearCalle(
      comoCalleId(analisis.data.calleId),
      comoLugarId(analisis.data.nuevoLugarId),
      contexto,
    );
  } catch (error) {
    volverAlArbol(undefined, undefined, mensajeDeError(error));
  }

  revalidatePath("/territorio");
  irAlArbol(undefined, undefined);
}
