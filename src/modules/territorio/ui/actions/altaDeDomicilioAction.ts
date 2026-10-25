"use server";

import { z } from "zod";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { altaDeDomicilio } from "../../composicion";
import {
  ColoniaRequeridaError,
  comoCalleId,
  comoLugarId,
  TransversalRepetidaError,
  UbicacionIncoherenteError,
} from "../../domain";
import { VALOR_SIN_COLONIA } from "../declaracionDeDestino";
import { ejecutarEnContexto } from "./ejecutarEnContexto";
import { confirmarEnArbol, navegacionDe, volverAlArbol } from "./volverAlArbol";

/** Mismo reparto que `altaDeCalleAction`. Formulario nativo sin `use client`. */

const esquemaDeEntrada = z.object({
  calleId: z.string().trim().uuid(),
  lugarId: z.union([
    z.literal(""),
    z.literal(VALOR_SIN_COLONIA),
    z.string().trim().uuid(),
  ]),
  numero: z.string().trim().optional(),
  entreCalleAId: z.union([z.literal(""), z.string().trim().uuid()]),
  entreCalleBId: z.union([z.literal(""), z.string().trim().uuid()]),
  referencia: z.string().trim().optional(),
});
const MENSAJE_FORMULARIO_INVALIDO = "La calle es obligatoria.";
const MENSAJE_GENERICO = "No se pudo completar el alta. Intente de nuevo.";

const comandoDe = (datos: z.infer<typeof esquemaDeEntrada>) => {
  const sinColonia = datos.lugarId === VALOR_SIN_COLONIA;
  const zona =
    datos.lugarId && !sinColonia ? comoLugarId(datos.lugarId) : undefined;

  return {
    ...(zona ? { lugarId: zona } : {}),
    ...(sinColonia ? { sinColonia: true } : {}),
    nivelesDeclarados: zona ? [zona] : [],
    calleId: comoCalleId(datos.calleId),
    numero: datos.numero || null,
    entreCalleAId: datos.entreCalleAId
      ? comoCalleId(datos.entreCalleAId)
      : null,
    entreCalleBId: datos.entreCalleBId
      ? comoCalleId(datos.entreCalleBId)
      : null,
    referencia: datos.referencia || null,
  };
};

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  // lugarId o calleId de otro tenant o inexistente: RLS ya lo esconde antes
  // del FK compuesto (altaDeDomicilio.ts).
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof TransversalRepetidaError) return error.message;
  if (error instanceof UbicacionIncoherenteError) return error.message;
  if (error instanceof ColoniaRequeridaError) return error.message;

  console.error(
    "[territorio] alta de domicilio fallo",
    datosSegurosDeError(error),
  );

  return MENSAJE_GENERICO;
};

export async function altaDeDomicilioAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    calleId: formData.get("calleId"),
    lugarId: formData.get("lugarId") ?? "",
    numero: formData.get("numero") ?? undefined,
    entreCalleAId: formData.get("entreCalleAId") ?? "",
    entreCalleBId: formData.get("entreCalleBId") ?? "",
    referencia: formData.get("referencia") ?? undefined,
  });

  const navegacion = navegacionDe(formData);

  if (!analisis.success) {
    volverAlArbol(navegacion, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  await ejecutarEnContexto(
    navegacion,
    (contexto) => altaDeDomicilio(comandoDe(analisis.data), contexto),
    mensajeDeError,
  );
  confirmarEnArbol(navegacion, "domicilio-creado");
}
