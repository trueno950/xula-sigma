"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { reimprimirConstancia } from "../../composicion";
import {
  comoConstanciaId,
  DocumentoCanceladoError,
  MOTIVOS_DE_REIMPRESION,
} from "../../domain";

/**
 * Borde de sesion de la reimpresion. Formulario nativo sin `use client`: la
 * excepcion de `AGENTS.md`, seccion Server Actions. El camino feliz no
 * redirige a la constancia -redirige al PDF con `?reimpresion=<id>`
 * (design.md de `constancias-oficios`, seccion 11): es lo que le pide la
 * marca de agua de la reimpresion a `pdfDeConstancia`.
 */

const esquemaDeEntrada = z.object({
  constanciaId: z.string().trim().uuid(),
  motivo: z.enum(MOTIVOS_DE_REIMPRESION),
});

const MENSAJE_FORMULARIO_INVALIDO = "Motivo de reimpresion invalido.";
const MENSAJE_GENERICO = "No se pudo reimprimir. Intente de nuevo.";

const redirigirConError = (constanciaId: string, mensaje: string): never =>
  redirect(`/constancias/${constanciaId}?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  // Constancia inexistente o de otro tenant: mismo criterio que
  // `emitirConstanciaAction`, 404 y no 403.
  if (error instanceof NoEncontradoError) return "Esa constancia no existe.";
  if (error instanceof DocumentoCanceladoError) return error.message;

  console.error("[constancias] reimpresion fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function reimprimirConstanciaAction(
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

  let reimpresionId: string;

  try {
    reimpresionId = await reimprimirConstancia(
      comoConstanciaId(constanciaId),
      motivo,
      contexto,
    );
  } catch (error) {
    redirigirConError(constanciaId, mensajeDeError(error));
    return;
  }

  redirect(
    `/constancias/${constanciaId}/pdf?reimpresion=${encodeURIComponent(reimpresionId)}`,
  );
}
