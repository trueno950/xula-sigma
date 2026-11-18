"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { editarPersona } from "../../composicion";
import {
  CurpInvalidaError,
  comoPersonaId,
  PersonaInvalidaError,
} from "../../domain";

/**
 * Mismo reparto que `altaDePersonaAction`: esta accion valida la forma del
 * `FormData`, resuelve el contexto y traduce el resultado. El
 * `ayuntamientoId` no se lee nunca del formulario -lo pone el contexto del
 * servidor-, y el caso de uso vuelve a exigir `puedeEscribir`.
 *
 * `CorregirDatos` es el `<form action={...}>` nativo de esta accion, y por
 * eso el error viaja por `redirect` + `?error=` en vez de `ActionResult<T>`:
 * la excepcion de formulario nativo sin `use client` de `AGENTS.md`.
 *
 * El id se valida aparte del resto de los datos para saber a donde volver:
 * con una persona reconocible el error se pinta en su ficha, y sin ella no
 * hay ficha a la cual regresar (`registrarMudanzaAction` aplica el mismo
 * criterio).
 */
const esquemaDeId = z.uuid();
const esquemaDeDatos = z.object({
  nombres: z.string().trim().min(1),
  primerApellido: z.string().trim().min(1),
  segundoApellido: z.string().trim(),
  curp: z.string().trim(),
});

const MENSAJE_FORMULARIO_INVALIDO =
  "Nombres y primer apellido son obligatorios.";
const MENSAJE_GENERICO =
  "No se pudieron guardar los cambios. Intente de nuevo.";

const rutaDeLaFicha = (personaId: string) => `/padron/${personaId}`;
const fichaEnAdministrar = (personaId: string) =>
  `${rutaDeLaFicha(personaId)}?pestana=administrar`;

const redirigirConError = (personaId: string | null, mensaje: string): never =>
  redirect(
    personaId
      ? `${fichaEnAdministrar(personaId)}&error=${encodeURIComponent(mensaje)}`
      : `/padron?error=${encodeURIComponent(mensaje)}`,
  );

/**
 * Lista blanca, nunca `instanceof Error` a secas: un fallo de Postgres
 * tambien es `Error` y su `.message` no esta redactado para la operadora.
 */
const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof PersonaInvalidaError) return error.message;
  if (error instanceof CurpInvalidaError) return error.message;

  console.error("[padron] editar persona fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function editarPersonaAction(formData: FormData): Promise<void> {
  const analisisDeId = esquemaDeId.safeParse(formData.get("personaId"));
  const personaId = analisisDeId.success ? analisisDeId.data : null;

  const analisis = esquemaDeDatos.safeParse({
    nombres: formData.get("nombres"),
    primerApellido: formData.get("primerApellido"),
    segundoApellido: formData.get("segundoApellido") ?? "",
    curp: formData.get("curp") ?? "",
  });

  if (!analisisDeId.success || !analisis.success) {
    // `redirigirConError` esta tipada `never` porque `redirect` lo esta,
    // pero TypeScript no angosta `analisis` a traves de esa llamada
    // (`zod@4.4.3`): el `return` explicito deja ver la rama de exito.
    redirigirConError(personaId, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await editarPersona(
      comoPersonaId(analisisDeId.data),
      {
        nombres: analisis.data.nombres,
        primerApellido: analisis.data.primerApellido,
        segundoApellido: analisis.data.segundoApellido || null,
        curp: analisis.data.curp || null,
      },
      contexto,
    );
  } catch (error) {
    redirigirConError(personaId, mensajeDeError(error));
    return;
  }

  revalidatePath("/padron");
  revalidatePath(rutaDeLaFicha(analisisDeId.data));
  redirect(fichaEnAdministrar(analisisDeId.data));
}
