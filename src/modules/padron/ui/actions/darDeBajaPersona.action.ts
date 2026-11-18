"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { darDeBajaPersona } from "../../composicion";
import { comoPersonaId } from "../../domain";

/**
 * Mismo reparto que `editarPersonaAction`: valida la forma del `FormData`,
 * resuelve el contexto y traduce el resultado; el `ayuntamientoId` sale del
 * contexto del servidor y nunca del formulario. `DarDeBaja` es su
 * `<form action={...}>` nativo, asi que el error viaja por `?error=` en la
 * ficha -la excepcion de formulario nativo sin `use client` de
 * `AGENTS.md`-. La baja exitosa vuelve al listado: la persona ya no esta en
 * la ficha que la mostraba.
 */
const esquemaDeId = z.uuid();

const MENSAJE_FORMULARIO_INVALIDO = "No se pudo identificar a la persona.";
const MENSAJE_GENERICO =
  "No se pudo dar de baja a la persona. Intente de nuevo.";

const fichaEnAdministrar = (personaId: string) =>
  `/padron/${personaId}?pestana=administrar`;

const redirigirConError = (personaId: string | null, mensaje: string): never =>
  redirect(
    personaId
      ? `${fichaEnAdministrar(personaId)}&error=${encodeURIComponent(mensaje)}`
      : `/padron?error=${encodeURIComponent(mensaje)}`,
  );

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;

  console.error("[padron] baja de persona fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function darDeBajaPersonaAction(
  formData: FormData,
): Promise<void> {
  const analisisDeId = esquemaDeId.safeParse(formData.get("personaId"));

  if (!analisisDeId.success) {
    // Sin id reconocible no hay ficha a la cual volver: ver
    // `editarPersonaAction`, mismo criterio.
    redirigirConError(null, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await darDeBajaPersona(comoPersonaId(analisisDeId.data), contexto);
  } catch (error) {
    redirigirConError(analisisDeId.data, mensajeDeError(error));
    return;
  }

  revalidatePath("/padron");
  revalidatePath(`/padron/${analisisDeId.data}`);
  redirect("/padron");
}
