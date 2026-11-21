"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, ValidacionError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { cambiarColores } from "../../composicion";
import type { ClaveDeErrorDeMarca } from "../mensajesDeMarca";
import { colorElegido } from "../seleccionDeColor";
import { confirmarEnMarca, volverAMarca } from "./navegacionDeMarca";

/**
 * Guardar los colores del municipio (S1-S3).
 *
 * Formulario nativo sin `use client` (excepcion de AGENTS.md): el error
 * viaja por `redirect` + `?error=` con un **codigo** de `mensajesDeMarca.ts`
 * —nunca el texto de la excepcion ni una oracion en la URL (S4)— y la
 * pantalla lo traduce.
 *
 * Lo unico que valida el esquema es que haya dos colores: el formato, la
 * medibilidad y el contraste los decide `validarMarca` adentro del caso de
 * uso, que es la misma reja que protege al escudo.
 */

const esquemaDeEntrada = z.object({
  primario: z.string().trim().min(1),
  secundario: z.string().trim().min(1),
});

const claveDelFallo = (error: unknown): ClaveDeErrorDeMarca => {
  if (error instanceof NoAutorizadoError) return "sin-permiso";

  if (error instanceof ValidacionError) return "color-invalido";

  console.error("[marca] cambio de colores fallo", datosSegurosDeError(error));

  return "colores-no-guardados";
};

export async function cambiarColoresAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    primario: colorElegido(formData, "primario"),
    secundario: colorElegido(formData, "secundario"),
  });

  if (!analisis.success) {
    return volverAMarca("colores-incompletos");
  }

  // Ni el ayuntamiento ni el rol salen del formulario: un Server Action es
  // superficie publica y el contexto lo resuelve el servidor.
  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await cambiarColores(analisis.data, contexto);
  } catch (error) {
    volverAMarca(claveDelFallo(error));
  }

  revalidatePath("/marca");

  confirmarEnMarca("colores-guardados");
}
