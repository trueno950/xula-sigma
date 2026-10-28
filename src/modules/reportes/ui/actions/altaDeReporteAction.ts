"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contextoActual } from "@/shared/auth";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { esquemaDeReporte } from "../../application/validacionDeReporte";
import { registrarReporte } from "../../composicion";
import {
  ReportanteDadoDeBajaError,
  UbicacionInvalidaError,
} from "../../domain";

/**
 * Borde de sesion del alta (tasks.md 7.9). Formulario nativo sin
 * `use client`: la excepcion de `AGENTS.md`, seccion Server Actions. La
 * isla `SelectorDeUbicacionYTipo` vive adentro del mismo `<form>`
 * -design.md seccion 15-, y el envio sigue siendo este POST nativo.
 */

const MENSAJE_FORMULARIO_INVALIDO = "Revise los datos del reporte.";
const MENSAJE_GENERICO = "No se pudo registrar el reporte. Intente de nuevo.";

const redirigirConError = (mensaje: string): never =>
  redirect(`/reportes/alta?error=${encodeURIComponent(mensaje)}`);

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return error.message;
  if (error instanceof UbicacionInvalidaError) return error.message;
  if (error instanceof ReportanteDadoDeBajaError) return error.message;

  console.error("[reportes] alta de reporte fallo", datosSegurosDeError(error));

  return MENSAJE_GENERICO;
};

export async function altaDeReporteAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeReporte.safeParse({
    descripcion: formData.get("descripcion"),
    referencia: formData.get("referencia") || undefined,
    tipo: formData.get("tipo"),
    lugarId: formData.get("lugarId") || undefined,
    calleId: formData.get("calleId") || undefined,
    domicilioId: formData.get("domicilioId") || undefined,
    personaId: formData.get("personaId") || undefined,
  });

  if (!analisis.success) {
    redirigirConError(MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual();

  if (!contexto) redirect("/acceso");

  let id: string;

  try {
    id = await registrarReporte(
      {
        tipo: analisis.data.tipo,
        ...(analisis.data.lugarId ? { lugarId: analisis.data.lugarId } : {}),
        ...(analisis.data.calleId
          ? { calleId: analisis.data.calleId }
          : analisis.data.domicilioId
            ? {}
            : { calleId: null }),
        ...(analisis.data.domicilioId
          ? { domicilioId: analisis.data.domicilioId }
          : {}),
        referencia: analisis.data.referencia ?? null,
        descripcion: analisis.data.descripcion,
        personaId: analisis.data.personaId ?? null,
      },
      contexto,
    );
  } catch (error) {
    redirigirConError(mensajeDeError(error));
    return;
  }

  revalidatePath("/reportes");
  redirect(`/reportes/detalle/${id}`);
}
