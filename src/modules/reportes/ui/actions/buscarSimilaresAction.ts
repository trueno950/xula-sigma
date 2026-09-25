"use server";

import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import {
  type ActionResult,
  mapearError,
  NoAutorizadoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { fechaYHoraEnMerida } from "@/shared/lib/fecha";
import { buscarReportesSimilares } from "../../composicion";
import { type EstadoDeReporte, TIPOS_DE_INCIDENCIA } from "../../domain";

const esquemaDeEntrada = z.object({
  lugarId: z.string().trim().uuid(),
  tipo: z.enum(TIPOS_DE_INCIDENCIA),
});

/** Forma reducida para el cliente: fecha ya legible, sin el `Date` crudo. */
export type ReporteSimilarParaCliente = {
  id: string;
  folio: string;
  estado: EstadoDeReporte;
  descripcion: string;
  registradoEn: string;
};

/**
 * Invocada directamente desde la isla `"use client"` (design.md seccion
 * 15), no desde un `<form action>`. A diferencia de `sugerirDuplicadosAction`
 * de `padron` -la excepcion "nunca bloqueante" de `AGENTS.md`-, esta accion
 * **si** devuelve `ActionResult<T>`: es el contrato por defecto de una
 * Server Action leida por un componente cliente, y el buscador de
 * similares no cumple las tres condiciones de esa excepcion -no hay
 * declaracion explicita de "nunca bloqueante" para esta accion en si, solo
 * para el caso de uso que envuelve-, asi que no entra a esa lista.
 */
export async function buscarSimilaresAction(
  criterio: unknown,
): Promise<ActionResult<readonly ReporteSimilarParaCliente[]>> {
  try {
    const analisis = esquemaDeEntrada.safeParse(criterio);

    if (!analisis.success) {
      throw new ValidacionError({ criterio: "Elija lugar y tipo." });
    }

    const contexto = await contextoActual();

    if (!contexto) throw new NoAutorizadoError();

    const similares = await buscarReportesSimilares(analisis.data, contexto);

    return {
      ok: true,
      data: similares.map((reporte) => ({
        id: reporte.id,
        folio: reporte.folio,
        estado: reporte.estado,
        descripcion: reporte.descripcion,
        registradoEn: fechaYHoraEnMerida(reporte.registradoEn),
      })),
    };
  } catch (error) {
    return mapearError(error);
  }
}
