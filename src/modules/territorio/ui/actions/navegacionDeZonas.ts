import { redirect } from "next/navigation";
import { z } from "zod";

/**
 * Los destinos de las acciones de zonas: `/territorio/zonas`, con el
 * detalle `?zona=` cuando la accion pasa ahi y, si la hubo, la falla o la
 * clave de confirmacion.
 *
 * Mismo contrato que `volverAlArbol` -el exito redirige con una clave de un
 * vocabulario cerrado, nunca texto de la operadora de vuelta a la URL-, pero
 * el destino es la pantalla de zonas y no el arbol territorial.
 */
export const CLAVES_DE_CONFIRMACION_DE_ZONAS = [
  "zona-alta",
  "zona-renombre",
  "zona-baja",
  "calle-agregada",
  "calle-en-zona-quitada",
] as const;

export type ClaveDeConfirmacionDeZona =
  (typeof CLAVES_DE_CONFIRMACION_DE_ZONAS)[number];

export const rutaDeZonas = (datos: {
  zona?: string | undefined;
  error?: string | undefined;
  ok?: ClaveDeConfirmacionDeZona | undefined;
}): string => {
  const parametros = new URLSearchParams();
  if (datos.zona) parametros.set("zona", datos.zona);
  if (datos.error) parametros.set("error", datos.error);
  if (datos.ok) parametros.set("ok", datos.ok);
  const consulta = parametros.toString();
  return consulta ? `/territorio/zonas?${consulta}` : "/territorio/zonas";
};

/** La zona desde la que se envio el formulario, para volver donde estaba. */
export const zonaDeNavegacion = (formData: FormData) =>
  z
    .string()
    .uuid()
    .optional()
    .catch(undefined)
    .parse(formData.get("zonaId")?.toString() || undefined);

export const volverAZonas = (zona: string | undefined, error: string): never =>
  redirect(rutaDeZonas({ zona, error }));

export const confirmarEnZonas = (
  zona: string | undefined,
  ok: ClaveDeConfirmacionDeZona,
): never => redirect(rutaDeZonas({ zona, ok }));
