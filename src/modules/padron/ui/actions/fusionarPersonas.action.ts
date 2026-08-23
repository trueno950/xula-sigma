"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { fusionarPersonas } from "../../composicion";
import { comoPersonaId } from "../../domain";

/**
 * Mismo reparto que `altaDePersonaAction`: esta accion valida la forma del
 * `FormData`, resuelve el contexto y traduce el resultado. El formato UUID
 * se valida aca, con `z.uuid()`, para que un id mal formado caiga en
 * `MENSAJE_FORMULARIO_INVALIDO` -el mismo criterio que `altaDePersonaAction`
 * aplica a sus errores de formato de dominio-. `comoPersonaId` vuelve a
 * validar del lado del dominio (no confia en el borde), pero su `Error`
 * generico no distingue "entrada mal formada" de una caida real de
 * infraestructura, y no esta en la lista blanca de `mensajeDeError`.
 */
const esquemaDeEntrada = z.object({
  perdedoraId: z.uuid(),
  ganadoraId: z.uuid(),
});

const MENSAJE_FORMULARIO_INVALIDO = "Selecciona las dos personas a fusionar.";
const MENSAJE_GENERICO = "No se pudo completar la fusion. Intente de nuevo.";

const redirigirConError = (mensaje: string): never =>
  redirect(`/padron?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;

  console.error("[padron] fusion fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function fusionarPersonasAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    perdedoraId: formData.get("perdedoraId"),
    ganadoraId: formData.get("ganadoraId"),
  });

  if (!analisis.success) {
    redirigirConError(MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await fusionarPersonas(
      comoPersonaId(analisis.data.perdedoraId),
      comoPersonaId(analisis.data.ganadoraId),
      contexto,
    );
  } catch (error) {
    redirigirConError(mensajeDeError(error));
    return;
  }

  revalidatePath("/padron");
  redirect("/padron");
}
