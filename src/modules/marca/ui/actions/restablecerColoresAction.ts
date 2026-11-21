"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { restablecerColores } from "../../composicion";
import { RestablecimientoSinConfirmarError } from "../../domain";
import type { ClaveDeErrorDeMarca } from "../mensajesDeMarca";
import { confirmarEnMarca, volverAMarca } from "./navegacionDeMarca";

/**
 * Volver a los colores por defecto de XULA (S5).
 *
 * Formulario nativo sin `use client`, misma excepcion de AGENTS.md que el
 * alta de colores, y el mismo transporte: un codigo de `mensajesDeMarca.ts`
 * en la URL, nunca una oracion (S4).
 *
 * `ambito` es un campo cerrado que dice que se restablece. El dia que
 * `/marca` tenga un segundo boton de restablecer —el escudo, por ejemplo— un
 * formulario viejo en una pestana abierta no puede terminar disparando el
 * otro.
 */

const esquemaDeEntrada = z.object({ ambito: z.literal("colores") });

/**
 * La casilla (S2), fuera del esquema a proposito: un valor distinto de `si`
 * no es un formulario mal formado, es «no confirmo», y ese rechazo tiene su
 * propia oracion. Se exige **antes** del caso de uso, asi que sin casilla no
 * se escribe una sola fila.
 */
const exigirConfirmacion = (valor: unknown): void => {
  if (valor !== "si") throw new RestablecimientoSinConfirmarError();
};

const claveDelFallo = (error: unknown): ClaveDeErrorDeMarca => {
  if (error instanceof NoAutorizadoError) return "sin-permiso";

  if (error instanceof RestablecimientoSinConfirmarError) {
    return "restablecimiento-sin-confirmar";
  }

  console.error(
    "[marca] restablecimiento de colores fallo",
    datosSegurosDeError(error),
  );

  return "restablecimiento-no-hecho";
};

export async function restablecerColoresAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    ambito: formData.get("ambito"),
  });

  if (!analisis.success) {
    return volverAMarca("restablecimiento-no-hecho");
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    exigirConfirmacion(formData.get("confirmar"));
    await restablecerColores(contexto);
  } catch (error) {
    volverAMarca(claveDelFallo(error));
  }

  revalidatePath("/marca");

  confirmarEnMarca("colores-restablecidos");
}
