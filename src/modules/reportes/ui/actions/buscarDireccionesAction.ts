"use server";

import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import {
  type ActionResult,
  mapearError,
  NoAutorizadoError,
  ValidacionError,
} from "@/shared/lib/errores";
import {
  MAXIMO_DE_CARACTERES_PARA_BUSCAR_DIRECCIONES,
  MINIMO_DE_CARACTERES_PARA_BUSCAR_DIRECCIONES,
  type ResultadoDeBusquedaParaSelector,
} from "../../application/buscarDireccionesParaReporte";
import { buscarDireccionesParaReporte } from "../../composicion";

const esquemaDeEntrada = z.object({
  consulta: z
    .string()
    .trim()
    .min(MINIMO_DE_CARACTERES_PARA_BUSCAR_DIRECCIONES)
    .max(MAXIMO_DE_CARACTERES_PARA_BUSCAR_DIRECCIONES),
});

/** Solo se serializan el id, la etiqueta visible y el lugar para sugerencias. */
export type DireccionParaReporte =
  ResultadoDeBusquedaParaSelector["opciones"][number];

/** Lectura tenant-scoped invocada desde el selector cliente, nunca desde un GET. */
export async function buscarDireccionesAction(
  criterio: unknown,
): Promise<ActionResult<ResultadoDeBusquedaParaSelector>> {
  const analisis = esquemaDeEntrada.safeParse(criterio);

  if (!analisis.success) {
    return mapearError(
      new ValidacionError({
        consulta: "Escriba al menos dos caracteres para buscar direcciones.",
      }),
    );
  }

  try {
    const contexto = await contextoActual();
    if (!contexto) throw new NoAutorizadoError();

    const resultado = await buscarDireccionesParaReporte(
      analisis.data.consulta,
      contexto,
    );

    return { ok: true, data: resultado };
  } catch (error) {
    return mapearError(error);
  }
}
