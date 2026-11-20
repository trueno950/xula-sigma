"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type ContextoActual, contextoActual } from "@/shared/auth";
import {
  NoAutorizadoError,
  NoEncontradoError,
  TenantNoResueltoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { cambiarEstadoDeIntervencion } from "../../composicion";
import {
  CancelacionSinConfirmarError,
  ESTADOS_DE_INTERVENCION,
  IntervencionCerradaError,
  TransicionInvalidaError,
} from "../../domain";

const esquema = z.strictObject({
  id: z.string().trim().uuid(),
  estadoNuevo: z.enum(ESTADOS_DE_INTERVENCION),
  /** La casilla de S12: obligatoria solo para cancelar, y se exige aqui tambien. */
  confirmar: z.literal("si").optional(),
});
const MENSAJE_INVALIDO = "Datos de la transición inválidos.";
const MENSAJE_GENERICO = "No se pudo cambiar el estado. Intente de nuevo.";

const exigirConfirmacionDeCancelacion = (datos: {
  estadoNuevo: (typeof ESTADOS_DE_INTERVENCION)[number];
  confirmar?: "si" | undefined;
}): void => {
  if (datos.estadoNuevo === "CANCELADA" && datos.confirmar !== "si") {
    throw new CancelacionSinConfirmarError();
  }
};

const redirigirConError = (id: string, mensaje: string): never =>
  redirect(`/intervenciones/${id}?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return "Esa intervención no existe.";
  if (error instanceof TenantNoResueltoError) {
    return "No se pudo determinar el ayuntamiento del acceso.";
  }
  if (
    error instanceof CancelacionSinConfirmarError ||
    error instanceof IntervencionCerradaError ||
    error instanceof TransicionInvalidaError ||
    error instanceof ValidacionError
  ) {
    return error.message;
  }
  console.error(
    "[intervenciones] cambio de estado fallo",
    datosSegurosDeError(error),
  );
  return MENSAJE_GENERICO;
};

export async function cambiarEstadoAction(formData: FormData): Promise<void> {
  const analisis = esquema.safeParse({
    id: formData.get("id"),
    estadoNuevo: formData.get("estadoNuevo"),
    confirmar: formData.get("confirmar") ?? undefined,
  });
  const idCrudo = formData.get("id");
  const id = typeof idCrudo === "string" ? idCrudo : "";

  if (!analisis.success) {
    redirigirConError(id, MENSAJE_INVALIDO);
    return;
  }

  let contexto: ContextoActual | null;

  try {
    contexto = await contextoActual();
  } catch (error) {
    redirigirConError(id, mensajeDeError(error));
    return;
  }

  if (!contexto) redirect("/acceso");

  try {
    exigirConfirmacionDeCancelacion(analisis.data);
    await cambiarEstadoDeIntervencion(
      { id: analisis.data.id, estadoNuevo: analisis.data.estadoNuevo },
      contexto,
    );
  } catch (error) {
    redirigirConError(id, mensajeDeError(error));
    return;
  }

  revalidatePath(`/intervenciones/${id}`);
  redirect(`/intervenciones/${id}`);
}
