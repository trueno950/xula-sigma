"use server";

import { z } from "zod";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { darDeBajaLugar } from "../../composicion";
import { comoLugarId, LugarConDependientesError } from "../../domain";
import { ejecutarEnContexto } from "./ejecutarEnContexto";
import { irAlArbol, navegacionDe, volverAlArbol } from "./volverAlArbol";

/** Mismo reparto que `altaDeLugarAction`. Formulario nativo sin `use client`. */

const esquemaDeEntrada = z.object({
  id: z.string().trim().uuid(),
});

const MENSAJE_FORMULARIO_INVALIDO = "Falta el lugar a dar de baja.";
const MENSAJE_GENERICO = "No se pudo completar la baja. Intente de nuevo.";

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof LugarConDependientesError) return error.message;

  console.error("[territorio] baja de lugar fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function darDeBajaLugarAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    id: formData.get("id"),
  });

  const navegacion = navegacionDe(formData);

  if (!analisis.success) {
    volverAlArbol(navegacion, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const id = comoLugarId(analisis.data.id);

  await ejecutarEnContexto(
    navegacion,
    (contexto) => darDeBajaLugar(id, contexto),
    mensajeDeError,
  );

  // El nodo abierto es justo el que se dio de baja, asi que la URL actual
  // ya no resuelve: se sube al padre. Dando de baja la raiz misma no queda
  // arbol que abrir y el destino es el listado.
  irAlArbol(
    navegacion.nodo === navegacion.raiz ? undefined : navegacion.raiz,
    navegacion.padre,
    "lugar-baja",
  );
}
