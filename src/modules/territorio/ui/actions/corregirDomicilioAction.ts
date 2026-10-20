"use server";

import { z } from "zod";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { corregirDomicilio } from "../../composicion";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  type LugarId,
  TransversalRepetidaError,
  UbicacionIncoherenteError,
} from "../../domain";
import { ejecutarEnContexto } from "./ejecutarEnContexto";
import { confirmarEnArbol, navegacionDe, volverAlArbol } from "./volverAlArbol";

const esquemaDeEntrada = z.object({
  domicilioId: z.string().trim().uuid(),
  calleId: z.string().trim().uuid(),
  zonaId: z.union([z.literal(""), z.string().trim().uuid()]),
  numero: z.string().trim().optional(),
  entreCalleAId: z.union([z.literal(""), z.string().trim().uuid()]),
  entreCalleBId: z.union([z.literal(""), z.string().trim().uuid()]),
  referencia: z.string().trim().optional(),
});
const MENSAJE_FORMULARIO_INVALIDO = "La calle es obligatoria.";
const MENSAJE_GENERICO = "No se pudo guardar la corrección. Intente de nuevo.";

/** Sin zona no se declara nada: el caso de uso la deriva de la calle. */
const zonaDeclarada = (datos: { zonaId: string }): readonly LugarId[] =>
  datos.zonaId ? [comoLugarId(datos.zonaId)] : [];

const comandoDe = (datos: z.infer<typeof esquemaDeEntrada>) => {
  const declarados = zonaDeclarada(datos);
  const [zona] = declarados;

  return {
    id: comoDomicilioId(datos.domicilioId),
    ...(zona ? { lugarId: zona } : {}),
    nivelesDeclarados: declarados,
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
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof TransversalRepetidaError) return error.message;
  if (error instanceof UbicacionIncoherenteError) return error.message;

  console.error(
    "[territorio] correccion de domicilio fallo",
    datosSegurosDeError(error),
  );

  return MENSAJE_GENERICO;
};

export async function corregirDomicilioAction(
  formData: FormData,
): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    domicilioId: formData.get("domicilioId"),
    calleId: formData.get("calleId"),
    zonaId: formData.get("zonaId") ?? "",
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
    (contexto) => corregirDomicilio(comandoDe(analisis.data), contexto),
    mensajeDeError,
  );
  confirmarEnArbol(navegacion, "domicilio-corregido");
}
