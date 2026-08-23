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
 * `FormData`, resuelve el contexto y traduce el resultado. `comoPersonaId`
 * hace la validacion real de formato -sus dos IDs no son un UUID cualquiera,
 * son las dos personas a fusionar-, no `esquemaDeEntrada`.
 */
const esquemaDeEntrada = z.object({
  perdedoraId: z.string().trim().min(1),
  ganadoraId: z.string().trim().min(1),
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
