"use server";

import { z } from "zod";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { altaDeCalle } from "../../composicion";
import {
  CatalogoDeCallesSoloEnAsentamientosError,
  comoLugarId,
  NombreDeCalleDuplicadoError,
} from "../../domain";
import { ejecutarEnContexto } from "./ejecutarEnContexto";
import { confirmarEnArbol, navegacionDe, volverAlArbol } from "./volverAlArbol";

/** Mismo reparto que `altaDeLugarAction`. Formulario nativo sin `use client`. */

const esquemaDeEntrada = z.object({
  nombre: z.string().trim().min(1),
  lugarId: z.string().trim().uuid(),
});
const MENSAJE_FORMULARIO_INVALIDO = "Nombre y lugar son obligatorios.";
const MENSAJE_GENERICO = "No se pudo completar el alta. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  // lugarId de otro tenant o inexistente: RLS ya lo esconde antes del FK
  // compuesto (altaDeCalle.ts).
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof CatalogoDeCallesSoloEnAsentamientosError) {
    return error.message;
  }
  if (error instanceof NombreDeCalleDuplicadoError) return error.message;

  console.error("[territorio] alta de calle fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function altaDeCalleAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    nombre: formData.get("nombre"),
    lugarId: formData.get("lugarId"),
  });

  const navegacion = navegacionDe(formData);

  if (!analisis.success) {
    volverAlArbol(navegacion, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const { nombre, lugarId } = analisis.data;

  await ejecutarEnContexto(
    navegacion,
    (contexto) =>
      altaDeCalle({ nombre, lugarId: comoLugarId(lugarId) }, contexto),
    mensajeDeError,
  );
  confirmarEnArbol(navegacion, "calle-creada");
}
