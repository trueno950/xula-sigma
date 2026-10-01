import type { ActionResult } from "@/shared/lib/errores";
import type { EscudoCambiado } from "../types";

export const MENSAJE_DE_SUBIDA_FALLIDA =
  "No se pudo subir el archivo. Intente de nuevo.";

type AccionDeEscudo = (
  formData: FormData,
) => Promise<ActionResult<EscudoCambiado>>;

export type ResultadoDeSubida = { ok: true } | { ok: false; mensaje: string };

/**
 * Manda el archivo y devuelve siempre un resultado que el formulario puede
 * pintar. Un rechazo del transporte -un cuerpo mayor al limite de Next, la
 * red que se cae- no llega como `ActionResult`: la promesa de la Server
 * Action se rechaza, y sin este `catch` el formulario quedaba sin mensaje y
 * con una promesa rechazada sin manejar.
 */
export async function subirEscudo(
  archivo: File,
  accion: AccionDeEscudo,
): Promise<ResultadoDeSubida> {
  const formData = new FormData();
  formData.set("escudo", archivo);

  try {
    const resultado = await accion(formData);

    if (resultado.ok) return { ok: true };

    return {
      ok: false,
      mensaje: resultado.campos?.escudo ?? resultado.mensaje,
    };
  } catch (error: unknown) {
    console.error(
      "Fallo al subir el escudo",
      error instanceof Error ? error.name : typeof error,
    );
    return { ok: false, mensaje: MENSAJE_DE_SUBIDA_FALLIDA };
  }
}
