"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { contextoActual } from "@/shared/auth";
import {
  type ActionResult,
  mapearError,
  NoAutorizadoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { cambiarEscudo } from "../../composicion";
import type { EscudoCambiado } from "../../types";

/**
 * Camino de escritura, borde de sesion (ADR 0001 seccion 4, design.md
 * seccion 5, pasos 1-2 y 5-6). Los pasos 3-4 —bytes, PUT, transaccion,
 * borrado diferido— viven en `cambiarEscudo` ya cableado por
 * `composicion.ts`; esta accion solo valida la forma de la entrada,
 * resuelve el contexto y traduce el resultado.
 */

const UN_MIB = 1024 * 1024;

/**
 * Solo la forma del dato: que sea un archivo y que no exceda el limite de
 * un Server Action de Next (decision 3 de proposal.md — 1 MiB entra en el
 * limite por defecto). La firma PNG, el chunk `IHDR` y las dimensiones se
 * validan mas adentro, en `domain/png.ts`, sobre los bytes ya leidos: este
 * esquema no los conoce.
 */
const esquemaDeEntrada = z
  .instanceof(File, { message: "Suba un archivo." })
  .refine((archivo) => archivo.size > 0, "El archivo está vacío.")
  .refine((archivo) => archivo.size <= UN_MIB, "El archivo pesa más de 1 MiB.");

export async function cambiarEscudoAction(
  formData: FormData,
): Promise<ActionResult<EscudoCambiado>> {
  try {
    const analisis = esquemaDeEntrada.safeParse(formData.get("escudo"));

    if (!analisis.success) {
      throw new ValidacionError({
        escudo: analisis.error.issues[0]?.message ?? "Archivo inválido.",
      });
    }

    // El ayuntamientoId, el rol y el origen salen del contexto de sesion,
    // nunca de `formData`: un Server Action es superficie publica y recibe
    // lo que el cliente quiera mandarle.
    const contexto = await contextoActual();

    if (!contexto) throw new NoAutorizadoError();

    const bytes = new Uint8Array(await analisis.data.arrayBuffer());
    const escudo = await cambiarEscudo({ bytes }, contexto);

    revalidatePath("/marca");
    revalidatePath("/acceso");

    return { ok: true, data: escudo };
  } catch (error) {
    return mapearError(error);
  }
}
