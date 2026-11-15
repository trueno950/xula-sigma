import { redirect } from "next/navigation";
import type { ClaveDeConfirmacionDeMarca } from "../mensajesDeMarca";

/**
 * Los destinos de las dos acciones de colores: `/marca` con el error ya
 * redactado, o con la clave de confirmacion.
 *
 * Mismo contrato que `navegacionDeZonas`: el exito lleva una clave de un
 * vocabulario cerrado —nunca texto de la operadora de vuelta a la URL— y el
 * error lleva una de las oraciones de `mensajesDeMarca`, elegida por la
 * accion. La pagina solo pinta el `?error=` que ella misma supo mandar.
 */

export const rutaDeMarca = (datos: {
  error?: string;
  ok?: ClaveDeConfirmacionDeMarca;
}): string => {
  const parametros = new URLSearchParams();

  if (datos.error) parametros.set("error", datos.error);
  if (datos.ok) parametros.set("ok", datos.ok);

  const consulta = parametros.toString();

  return consulta ? `/marca?${consulta}` : "/marca";
};

export const volverAMarca = (error: string): never =>
  redirect(rutaDeMarca({ error }));

export const confirmarEnMarca = (ok: ClaveDeConfirmacionDeMarca): never =>
  redirect(rutaDeMarca({ ok }));
