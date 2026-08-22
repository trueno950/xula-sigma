"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { altaDePersona } from "../../composicion";
import { CurpInvalidaError, PersonaInvalidaError } from "../../domain";

/**
 * Borde de sesion del alta (mismo reparto de responsabilidades que
 * `cambiarEscudo.action.ts`): esta accion solo valida la forma del
 * `FormData`, resuelve el contexto y traduce el resultado. El caso de uso
 * ya cableado por `composicion.ts` hace el resto.
 *
 * `FormularioDeAltaDePersona` (tasks.md 2.14) es el `<form action={...}>`
 * nativo de esta accion. Por que no devuelve `ActionResult<T>` y el error
 * viaja como `searchParams`: la excepcion de formulario nativo sin
 * `use client` en `AGENTS.md`, seccion Server Actions.
 */

const esquemaDeEntrada = z.object({
  nombres: z.string().trim().min(1),
  primerApellido: z.string().trim().min(1),
  segundoApellido: z.string().trim(),
  curp: z.string().trim(),
});

const MENSAJE_FORMULARIO_INVALIDO =
  "Nombres y primer apellido son obligatorios.";
const MENSAJE_GENERICO = "No se pudo completar el alta. Intente de nuevo.";

const redirigirConError = (mensaje: string): never =>
  redirect(`/padron/alta?error=${encodeURIComponent(mensaje)}`);

/**
 * Lista blanca, no `instanceof Error` a secas (antipatron 24: el
 * comentario anterior afirmaba que solo llegaban estos dos tipos, pero
 * nada lo imponia — un error de Postgres/Drizzle tambien es `Error` y su
 * `.message` no esta redactado para la operadora). Cualquier tipo no
 * reconocido cae en el generico y queda en el log del servidor, mismo
 * contrato que `mapearError` en `shared/lib/errores.ts`.
 */
const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof PersonaInvalidaError) return error.message;
  if (error instanceof CurpInvalidaError) return error.message;

  console.error("[padron] alta fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function altaDePersonaAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    nombres: formData.get("nombres"),
    primerApellido: formData.get("primerApellido"),
    segundoApellido: formData.get("segundoApellido") ?? "",
    curp: formData.get("curp") ?? "",
  });

  if (!analisis.success) {
    // `redirigirConError` esta tipada `never` porque `redirect` lo esta,
    // pero TypeScript no angosta `analisis` a traves de esa llamada -se
    // verifico de forma aislada, `zod@4.4.3`-: hace falta un `return`
    // explicito para que el resto del cuerpo vea la rama de exito.
    redirigirConError(MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await altaDePersona(
      {
        nombres: analisis.data.nombres,
        primerApellido: analisis.data.primerApellido,
        segundoApellido: analisis.data.segundoApellido || null,
        curp: analisis.data.curp || null,
      },
      contexto,
    );
  } catch (error) {
    redirigirConError(mensajeDeError(error));
  }

  revalidatePath("/padron");
  redirect("/padron");
}
