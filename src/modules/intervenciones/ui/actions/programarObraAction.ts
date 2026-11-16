"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import type { ContextoActual } from "@/shared/auth/contexto";
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

type EntradaDeLaObra = z.infer<typeof esquemaDeEntrada>;

const MENSAJE_FORMULARIO_INVALIDO = "Revise los datos de la obra.";
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

const esUuid = (valor: string) => z.string().uuid().safeParse(valor).success;

/**
 * La entrada del formulario, o el redirect con el mensaje de la operadora. Un
 * `reporteId` que no es uuid no tiene detalle al que volver: ese error va al
 * listado en vez de a una URL que responderia 404.
 */
function leerEntrada(formData: FormData): EntradaDeLaObra {
  const analisis = esquemaDeEntrada.safeParse({
    reporteId: formData.get("reporteId"),
    tipo: formData.get("tipo"),
    descripcion: formData.get("descripcion"),
  });
  if (analisis.success) return analisis.data;

  const crudo = formData.get("reporteId");
  const reporteId = typeof crudo === "string" ? crudo : "";

  if (!esUuid(reporteId)) {
    redirect(
      `/reportes?error=${encodeURIComponent(MENSAJE_FORMULARIO_INVALIDO)}`,
    );
  }

  return redirigirConError(reporteId, MENSAJE_FORMULARIO_INVALIDO);
}

async function programarYVolver(
  entrada: EntradaDeLaObra,
  contexto: ContextoActual,
): Promise<void> {
  try {
    await programarObraDeReporte(entrada, contexto);
  } catch (error) {
    return redirigirConError(entrada.reporteId, mensajeDeError(error));
  }

  revalidatePath(`/reportes/detalle/${entrada.reporteId}`);
}

export async function programarObraAction(formData: FormData): Promise<void> {
  const entrada = leerEntrada(formData);

  const contexto = await contextoActual().catch((error) =>
    redirigirConError(entrada.reporteId, mensajeDeError(error)),
  );
  if (!contexto) redirect("/acceso");

  await programarYVolver(entrada, contexto);

  redirect(`/reportes/detalle/${entrada.reporteId}`);
}
