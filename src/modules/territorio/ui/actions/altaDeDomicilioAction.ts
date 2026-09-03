"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { altaDeDomicilio } from "../../composicion";
import {
  comoCalleId,
  comoLugarId,
  TransversalRepetidaError,
} from "../../domain";
import { navegacionDe, volverAlArbol } from "./volverAlArbol";

/** Mismo reparto que `altaDeCalleAction`. Formulario nativo sin `use client`. */

const esquemaDeEntrada = z.object({
  lugarId: z.string().trim().uuid(),
  calleId: z.string().trim().uuid(),
  numero: z.string().trim().optional(),
  entreCalleAId: z.union([z.literal(""), z.string().trim().uuid()]),
  entreCalleBId: z.union([z.literal(""), z.string().trim().uuid()]),
  referencia: z.string().trim().optional(),
});
const MENSAJE_FORMULARIO_INVALIDO = "Lugar y calle son obligatorios.";
const MENSAJE_GENERICO = "No se pudo completar el alta. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  // lugarId o calleId de otro tenant o inexistente: RLS ya lo esconde antes
  // del FK compuesto (altaDeDomicilio.ts).
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof TransversalRepetidaError) return error.message;

  console.error(
    "[territorio] alta de domicilio fallo",
    datosSegurosDeError(error),
  );

  return MENSAJE_GENERICO;
};

export async function altaDeDomicilioAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    lugarId: formData.get("lugarId"),
    calleId: formData.get("calleId"),
    numero: formData.get("numero") ?? undefined,
    entreCalleAId: formData.get("entreCalleAId") ?? "",
    entreCalleBId: formData.get("entreCalleBId") ?? "",
    referencia: formData.get("referencia") ?? undefined,
  });

  const { raiz, nodo } = navegacionDe(formData);

  if (!analisis.success) {
    volverAlArbol(raiz, nodo, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  try {
    await altaDeDomicilio(
      {
        lugarId: comoLugarId(analisis.data.lugarId),
        calleId: comoCalleId(analisis.data.calleId),
        numero: analisis.data.numero || null,
        entreCalleAId: analisis.data.entreCalleAId
          ? comoCalleId(analisis.data.entreCalleAId)
          : null,
        entreCalleBId: analisis.data.entreCalleBId
          ? comoCalleId(analisis.data.entreCalleBId)
          : null,
        referencia: analisis.data.referencia || null,
      },
      contexto,
    );
  } catch (error) {
    volverAlArbol(raiz, nodo, mensajeDeError(error));
  }

  revalidatePath("/territorio");
}
