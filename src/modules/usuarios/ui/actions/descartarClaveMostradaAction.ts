"use server";

import { z } from "zod";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { descartarClaveMostrada } from "../claveTemporalEnCookie";

const esquemaDeEntrada = z.string().trim().uuid();

/**
 * Invocada directo por `DescartarClaveAlMostrar` (`"use client"`), no por un
 * `<form action>`: consume la cookie de la clave ya mostrada (S4). Un fallo
 * se registra en el log del servidor, nunca viaja al navegador.
 */
export async function descartarClaveMostradaAction(
  token: unknown,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse(token);
  if (!analisis.success) {
    console.error("[usuarios] token de la clave mostrada invalido");
    return;
  }

  try {
    await descartarClaveMostrada(analisis.data);
  } catch (error) {
    console.error("[usuarios] clave mostrada", datosSegurosDeError(error));
  }
}
