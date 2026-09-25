"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { cancelarConstancia } from "../../composicion";
import { comoConstanciaId, MOTIVOS_DE_CANCELACION } from "../../domain";

/**
 * Borde de sesion de la cancelacion. Formulario nativo sin `use client`: la
 * excepcion de `AGENTS.md`, seccion Server Actions. La visibilidad del boton
 * la decide la pagina con `puedeAdministrarDocumentos` -ocultar un boton no
 * es autorizacion (`shared/auth/roles.ts`)-; la autorizacion real vive en
 * `cancelarConstancia`, que esta accion llama sin repetir el chequeo de rol.
 * Lo que se arma aca es el mensaje legible cuando ese chequeo rechaza.
 */

const esquemaDeEntrada = z.object({
  constanciaId: z.string().trim().uuid(),
  motivo: z.enum(MOTIVOS_DE_CANCELACION),
});

const MENSAJE_FORMULARIO_INVALIDO = "Motivo de cancelación inválido.";
const MENSAJE_GENERICO = "No se pudo cancelar. Intente de nuevo.";

const redirigirConError = (constanciaId: string, mensaje: string): never =>
  redirect(`/constancias/${constanciaId}?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  // Inexistente, de otro tenant o ya cancelada: las tres iguales
  // (design.md de `constancias-oficios`, seccion 10).
  if (error instanceof NoEncontradoError) return "Esa constancia no existe.";

  console.error("[constancias] cancelacion fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function cancelarConstanciaAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    constanciaId: formData.get("constanciaId"),
    motivo: formData.get("motivo"),
  });

  const constanciaIdCruda = formData.get("constanciaId");
  const idParaRedirigir =
    typeof constanciaIdCruda === "string" ? constanciaIdCruda : "";

  if (!analisis.success) {
    redirigirConError(idParaRedirigir, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const { constanciaId, motivo } = analisis.data;
  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await cancelarConstancia(comoConstanciaId(constanciaId), motivo, contexto);
  } catch (error) {
    redirigirConError(constanciaId, mensajeDeError(error));
    return;
  }

  revalidatePath(`/constancias/${constanciaId}`);
  redirect(`/constancias/${constanciaId}`);
}
