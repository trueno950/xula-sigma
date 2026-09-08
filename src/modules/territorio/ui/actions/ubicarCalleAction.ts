"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { ubicarCalle } from "../../composicion";
import {
  comoCalleId,
  estaEnYucatan,
  PuntoFueraDeYucatanError,
} from "../../domain";
import { volverAlArbol } from "./volverAlArbol";

const coordenada = z
  .string()
  .trim()
  .refine((valor) => valor === "" || Number.isFinite(Number(valor)), {
    error: "Coordenada invalida.",
  })
  .transform((valor) => (valor === "" ? null : Number(valor)));

const esquemaDeEntrada = z
  .object({
    calleId: z.string().trim().uuid(),
    latitud: coordenada,
    longitud: coordenada,
  })
  .superRefine((datos, ctx) => {
    if ((datos.latitud === null) !== (datos.longitud === null)) {
      ctx.addIssue({ code: "custom", message: "Coordenada invalida." });
    }
    if (
      datos.latitud !== null &&
      datos.longitud !== null &&
      !estaEnYucatan({ latitud: datos.latitud, longitud: datos.longitud })
    ) {
      ctx.addIssue({
        code: "custom",
        message: "El punto debe estar dentro de Yucatan.",
      });
    }
  });

const MENSAJE_FORMULARIO_INVALIDO = "Coordenada invalida.";
const MENSAJE_GENERICO = "No se pudo guardar la ubicacion. Intente de nuevo.";

const puntoDe = (datos: z.infer<typeof esquemaDeEntrada>) =>
  datos.latitud === null || datos.longitud === null
    ? null
    : { latitud: datos.latitud, longitud: datos.longitud };

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof PuntoFueraDeYucatanError) return error.message;

  console.error(
    "[territorio] ubicacion de calle fallo",
    datosSegurosDeError(error),
  );
  return MENSAJE_GENERICO;
};

export async function ubicarCalleAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    calleId: formData.get("calleId"),
    latitud: formData.get("latitud")?.toString() ?? "",
    longitud: formData.get("longitud")?.toString() ?? "",
  });
  if (!analisis.success) {
    volverAlArbol(undefined, undefined, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();
  if (!contexto) redirect("/acceso");

  try {
    await ubicarCalle(
      comoCalleId(analisis.data.calleId),
      puntoDe(analisis.data),
      contexto,
    );
  } catch (error) {
    volverAlArbol(undefined, undefined, mensajeDeError(error));
  }

  revalidatePath("/territorio");
}
