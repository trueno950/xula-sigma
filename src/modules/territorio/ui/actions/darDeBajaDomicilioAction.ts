"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { darDeBajaDomicilio } from "../../composicion";
import { comoDomicilioId, DomicilioConResidentesError } from "../../domain";
import { irAlArbol, navegacionDe, volverAlArbol } from "./volverAlArbol";

const esquemaDeEntrada = z.object({
  domicilioId: z.string().trim().uuid(),
});
const MENSAJE_FORMULARIO_INVALIDO = "Falta el domicilio a dar de baja.";
const MENSAJE_GENERICO = "No se pudo completar la baja. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof DomicilioConResidentesError) return error.message;

  console.error(
    "[territorio] baja de domicilio fallo",
    datosSegurosDeError(error),
  );

  return MENSAJE_GENERICO;
};

export async function darDeBajaDomicilioAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    domicilioId: formData.get("domicilioId"),
  });
  const navegacion = navegacionDe(formData);
  if (!analisis.success) {
    volverAlArbol(navegacion, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();
  if (!contexto) redirect("/acceso");

  try {
    await darDeBajaDomicilio(
      comoDomicilioId(analisis.data.domicilioId),
      contexto,
    );
  } catch (error) {
    volverAlArbol(navegacion, mensajeDeError(error));
  }

  revalidatePath("/territorio");
  // La direccion que la URL nombra dejo de existir: quedarse ahi no resuelve.
  irAlArbol(navegacion.raiz, navegacion.nodo);
}
