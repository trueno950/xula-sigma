"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import {
  NoAutorizadoError,
  NoEncontradoError,
  TenantNoResueltoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { datosSegurosDeError } from "@/shared/lib/registroDeError";
import { programarObraDeReporte } from "../../composicion";
import { ReporteNoProgramableError, TIPOS_DE_INTERVENCION } from "../../domain";

/**
 * «Programar obra» desde el detalle del reporte (S2). Formulario nativo sin
 * `use client`, con su fila en la tabla de excepciones de `AGENTS.md`.
 *
 * La autorizacion real -`puedeAdministrarIntervenciones`- vive en
 * `programarObraDeReporte`: esta accion no repite el chequeo, solo redacta lo
 * que el caso de uso rechazo. El `ayuntamientoId` sale del contexto del
 * servidor, nunca del formulario.
 */

const esquemaDeEntrada = z.strictObject({
  reporteId: z.string().trim().uuid(),
  tipo: z.enum(TIPOS_DE_INTERVENCION),
  descripcion: z.string().trim().min(10).max(1000),
});

const MENSAJE_FORMULARIO_INVALIDO = "Revise los datos de la obra.";
const esUuid = (valor: string) => z.string().uuid().safeParse(valor).success;
const MENSAJE_GENERICO = "No se pudo programar la obra. Intente de nuevo.";

const redirigirConError = (reporteId: string, mensaje: string): never =>
  redirect(
    `/reportes/detalle/${reporteId}?error=${encodeURIComponent(mensaje)}`,
  );

const mensajeDeError = (error: unknown): string => {
  if (error instanceof NoAutorizadoError) return error.message;
  if (error instanceof NoEncontradoError) return "Ese reporte no existe.";
  if (error instanceof ReporteNoProgramableError) return error.message;
  if (error instanceof ValidacionError) return error.message;
  if (error instanceof TenantNoResueltoError) {
    return "No se pudo determinar el ayuntamiento del acceso.";
  }

  console.error(
    "[intervenciones] programar obra fallo",
    datosSegurosDeError(error),
  );

  return MENSAJE_GENERICO;
};

export async function programarObraAction(formData: FormData): Promise<void> {
  const analisis = esquemaDeEntrada.safeParse({
    reporteId: formData.get("reporteId"),
    tipo: formData.get("tipo"),
    descripcion: formData.get("descripcion"),
  });

  const reporteIdCrudo = formData.get("reporteId");
  const reporteId = typeof reporteIdCrudo === "string" ? reporteIdCrudo : "";

  if (!analisis.success) {
    if (!esUuid(reporteId)) {
      redirect(
        `/reportes?error=${encodeURIComponent(MENSAJE_FORMULARIO_INVALIDO)}`,
      );
    }
    redirigirConError(reporteId, MENSAJE_FORMULARIO_INVALIDO);
    return;
  }

  const contexto = await contextoActual().catch((error) =>
    redirigirConError(analisis.data.reporteId, mensajeDeError(error)),
  );

  if (!contexto) redirect("/acceso");

  try {
    await programarObraDeReporte(
      {
        reporteId: analisis.data.reporteId,
        tipo: analisis.data.tipo,
        descripcion: analisis.data.descripcion,
      },
      contexto,
    );
  } catch (error) {
    redirigirConError(analisis.data.reporteId, mensajeDeError(error));
    return;
  }

  revalidatePath(`/reportes/detalle/${analisis.data.reporteId}`);
  redirect(`/reportes/detalle/${analisis.data.reporteId}`);
}
