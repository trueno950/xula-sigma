"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import {
  NoAutorizadoError,
  NoEncontradoError,
  TenantNoResueltoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import type { IntervencionGuardada } from "../../application/puertos";
import { corregirIntervencion, intervencionPorId } from "../../composicion";
import { comoIntervencionId } from "../../domain";

const esquemaDeEntrada = z.strictObject({
  id: z.string().trim().uuid(),
  descripcion: z.string().trim().min(10).max(1000),
});

type PayloadDeCorreccion = Pick<
  IntervencionGuardada,
  | "id"
  | "tipo"
  | "fechaDeOcurrencia"
  | "lugarId"
  | "calleId"
  | "reporteId"
  | "descripcion"
>;

const construirPayloadDeCorreccion = (
  intervencion: IntervencionGuardada,
  descripcion: string,
): PayloadDeCorreccion => ({
  id: intervencion.id,
  tipo: intervencion.tipo,
  fechaDeOcurrencia: intervencion.fechaDeOcurrencia,
  lugarId: intervencion.lugarId,
  calleId: intervencion.calleId,
  reporteId: intervencion.reporteId,
  descripcion,
});

const MENSAJE_FORMULARIO_INVALIDO = "Datos de la corrección inválidos.";
const MENSAJE_GENERICO =
  "No se pudo corregir la intervención. Intente de nuevo.";

const redirigirConError = (id: string, mensaje: string): never =>
  redirect(`/intervenciones/${id}?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return "Esa intervención no existe.";
  if (error instanceof ValidacionError) return error.message;
  if (error instanceof TenantNoResueltoError) {
    return "No se pudo determinar el ayuntamiento del acceso.";
  }

  console.error(
    "[intervenciones] correccion fallo",
    datosSegurosDeError(error),
  );
  return MENSAJE_GENERICO;
};

export async function corregirIntervencionAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    id: formData.get("id"),
    descripcion: formData.get("descripcion"),
  });
  const idCrudo = formData.get("id");
  const idParaError = typeof idCrudo === "string" ? idCrudo : "";

  const entrada = analisis.success
    ? analisis.data
    : redirigirConError(idParaError, MENSAJE_FORMULARIO_INVALIDO);

  const contexto = await contextoActual().catch((error) =>
    redirigirConError(entrada.id, mensajeDeError(error)),
  );

  if (!contexto) redirect("/acceso");

  const intervencion = await intervencionPorId(
    comoIntervencionId(entrada.id),
    contexto,
  ).catch((error) => redirigirConError(entrada.id, mensajeDeError(error)));

  if (!intervencion)
    return redirigirConError(entrada.id, "Esa intervención no existe.");

  try {
    await corregirIntervencion(
      construirPayloadDeCorreccion(intervencion, entrada.descripcion),
      contexto,
    );
  } catch (error) {
    redirigirConError(entrada.id, mensajeDeError(error));
  }

  revalidatePath(`/intervenciones/${entrada.id}`);
  redirect(`/intervenciones/${entrada.id}`);
}
