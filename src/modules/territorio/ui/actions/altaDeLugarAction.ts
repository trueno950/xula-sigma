"use server";

import { z } from "zod";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { altaDeLugar } from "../../composicion";
import {
  CabeceraDuplicadaError,
  comoLugarId,
  JerarquiaInvalidaError,
  RaizInvalidaError,
  TIPOS_DE_LUGAR,
} from "../../domain";
import { ejecutarEnContexto } from "./ejecutarEnContexto";
import { confirmarEnArbol, navegacionDe, volverAlArbol } from "./volverAlArbol";

/**
 * Borde de sesion del alta (mismo reparto que `altaDePersonaAction`,
 * `padron`). Formulario nativo sin `use client`: la excepcion de
 * `AGENTS.md`, seccion Server Actions.
 */

const esquemaDeEntrada = z.object({
  tipo: z.enum(TIPOS_DE_LUGAR),
  nombre: z.string().trim().min(1),
  padreId: z.union([z.literal(""), z.string().trim().uuid()]),
});

const MENSAJE_FORMULARIO_INVALIDO = "Tipo y nombre son obligatorios.";
const MENSAJE_GENERICO = "No se pudo completar el alta. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  // padreId inexistente: puede pasar aunque el FK compuesto de Postgres lo
  // bloquee, si `padreId` referencia un lugar de otro tenant que RLS ya
  // esconde antes de llegar al FK (altaDeLugar.ts).
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof JerarquiaInvalidaError) return error.message;
  // Sin esto caia en el mensaje generico y el operador perdia lo unico que
  // le dice como salir: que la raiz tiene que ser cabecera o comisaria.
  if (error instanceof RaizInvalidaError) return error.message;
  if (error instanceof CabeceraDuplicadaError) return error.message;

  console.error("[territorio] alta de lugar fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function altaDeLugarAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    tipo: formData.get("tipo"),
    nombre: formData.get("nombre"),
    padreId: formData.get("padreId") ?? "",
  });

  const navegacion = navegacionDe(formData);

  if (!analisis.success) {
    volverAlArbol(navegacion, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const { tipo, nombre, padreId } = analisis.data;

  await ejecutarEnContexto(
    navegacion,
    (contexto) =>
      altaDeLugar(
        { tipo, nombre, padreId: padreId ? comoLugarId(padreId) : null },
        contexto,
      ),
    mensajeDeError,
  );
  confirmarEnArbol(navegacion, "lugar-creado");
}
