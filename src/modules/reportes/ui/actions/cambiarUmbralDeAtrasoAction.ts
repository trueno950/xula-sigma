"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, ValidacionError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { cambiarUmbralDeAtraso } from "../../composicion";
import { UMBRAL_DE_ATRASO_MAXIMO, UMBRAL_DE_ATRASO_MINIMO } from "../../domain";

/**
 * Borde de sesion del umbral de atraso. Formulario nativo sin `use client`:
 * la excepcion de `AGENTS.md` (seccion Server Actions), con su fila en la
 * tabla. Solo valida la forma del numero; el rango y el permiso los vuelve a
 * exigir `cambiarUmbralDeAtraso`, que es la guarda real -esconder el
 * formulario al rol que no administra no es autorizacion-.
 */

const esquemaDeEntrada = z.object({
  diasDeAtraso: z.coerce
    .number()
    .int()
    .min(UMBRAL_DE_ATRASO_MINIMO)
    .max(UMBRAL_DE_ATRASO_MAXIMO),
});

const MENSAJE_FUERA_DE_RANGO = `El umbral va de ${UMBRAL_DE_ATRASO_MINIMO} a ${UMBRAL_DE_ATRASO_MAXIMO} días.`;
const MENSAJE_GENERICO = "No se pudo guardar el umbral. Intente de nuevo.";

const redirigirConError = (mensaje: string): never =>
  redirect(`/reportes/configuracion?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof ValidacionError)
    return Object.values(error.campos)[0] ?? error.message;

  console.error(
    "[reportes] umbral de atraso fallo",
    datosSegurosDeError(error),
  );

  return MENSAJE_GENERICO;
};

export async function cambiarUmbralDeAtrasoAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    diasDeAtraso: formData.get("diasDeAtraso"),
  });

  if (!analisis.success) {
    redirigirConError(MENSAJE_FUERA_DE_RANGO);
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await cambiarUmbralDeAtraso(analisis.data.diasDeAtraso, contexto);
  } catch (error) {
    redirigirConError(mensajeDeError(error));
    return;
  }

  revalidatePath("/reportes/configuracion");
  revalidatePath("/reportes");
  redirect("/reportes/configuracion");
}
