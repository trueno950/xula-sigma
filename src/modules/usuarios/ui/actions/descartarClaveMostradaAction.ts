"use server";

import { z } from "zod";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { descartarClaveMostrada } from "../claveTemporalEnCookie";

const esquemaDeEntrada = z.string().trim().uuid();

/**
 * Invocada por `DescartarClaveAlMostrar` (`"use client"`): cubre el render
 * sintetico del redirect, donde el proxy no puede borrar la cookie (S2).
 */
export async function descartarClaveMostradaAction(
  token: unknown,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse(token);
  if (!analisis.success) return;

  try {
    await descartarClaveMostrada(analisis.data);
  } catch (error) {
    console.error("[usuarios] clave mostrada", datosSegurosDeError(error));
  }
}
