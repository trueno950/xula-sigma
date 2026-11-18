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
 *
 * La accion se envia desde el pliegue «Fusionar con otra persona…» de la
 * ficha, que ya fija la ganadora: por eso el error y el exito vuelven a esa
 * ficha -antes volvian a `/padron`, que no lee `?error=` y descartaba el
 * mensaje-. La ganadora es la que se conserva, asi que es la ficha que hay
 * que volver a mirar.
 */
const esquemaDeEntrada = z.object({
  perdedoraId: z.uuid(),
  ganadoraId: z.uuid(),
});

const MENSAJE_FORMULARIO_INVALIDO =
  "Seleccione la persona duplicada a fusionar.";
const MENSAJE_GENERICO = "No se pudo completar la fusión. Intente de nuevo.";

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
    // Con una ganadora reconocible el error se pinta en su ficha; sin ella
    // no hay ficha a la cual volver.
    const ganadora = z.uuid().safeParse(formData.get("ganadoraId"));
    redirigirConError(
      ganadora.success ? ganadora.data : null,
      MENSAJE_FORMULARIO_INVALIDO,
    );
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  const ficha = fichaEnAdministrar(analisis.data.ganadoraId);

  try {
    await fusionarPersonas(
      comoPersonaId(analisis.data.perdedoraId),
      comoPersonaId(analisis.data.ganadoraId),
      contexto,
    );
  } catch (error) {
    redirigirConError(analisis.data.ganadoraId, mensajeDeError(error));
    return;
  }

  revalidatePath("/padron");
  revalidatePath(`/padron/${analisis.data.ganadoraId}`);
  redirect(ficha);
}
