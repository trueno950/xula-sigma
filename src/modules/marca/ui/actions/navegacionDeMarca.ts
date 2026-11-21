import { redirect } from "next/navigation";
import type {
  ClaveDeConfirmacionDeMarca,
  ClaveDeErrorDeEscudo,
  ClaveDeErrorDeMarca,
} from "../mensajesDeMarca";

/**
 * Los destinos de `/marca`: el aviso de la pagina, el rechazo de un campo o
 * la clave de confirmacion.
 *
 * Mismo contrato que `navegacionDeZonas`, y ahora tambien en los errores: la
 * URL lleva **vocabulario cerrado** —un codigo, nunca una oracion— y el
 * texto lo pone la pantalla desde `mensajesDeMarca.ts` (S4). Por eso el tipo
 * del error es la union de los dos catalogos y no `string`.
 */

export type ClaveDeErrorDeMarcaEnUrl =
  | ClaveDeErrorDeMarca
  | ClaveDeErrorDeEscudo;

export const rutaDeMarca = (datos: {
  error?: ClaveDeErrorDeMarcaEnUrl;
  ok?: ClaveDeConfirmacionDeMarca;
}): string => {
  const parametros = new URLSearchParams();

  if (datos.error) parametros.set("error", datos.error);
  if (datos.ok) parametros.set("ok", datos.ok);

  const consulta = parametros.toString();

  return consulta ? `/marca?${consulta}` : "/marca";
};

export const volverAMarca = (error: ClaveDeErrorDeMarcaEnUrl): never =>
  redirect(rutaDeMarca({ error }));

export const confirmarEnMarca = (ok: ClaveDeConfirmacionDeMarca): never =>
  redirect(rutaDeMarca({ ok }));
