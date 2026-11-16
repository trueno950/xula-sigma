import type { ContextoActual } from "@/shared/auth/contexto";
import { puedeCambiarMarca } from "@/shared/auth/roles";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { escribirMarcaCompuesta } from "./escrituraDeMarca";
import type { RepositorioDeMarca } from "./puertos";

/**
 * Volver a los colores por defecto de XULA (S5): los tres se borran del
 * `jsonb` y el municipio vuelve al fallback de `globals.css`, sin escribir
 * ahi una copia de los valores por defecto que despues divergiria.
 *
 * El escudo no se toca: restablecer colores no es restablecer la marca, y
 * el municipio no pierde su identidad institucional por volver al rojo.
 */

const COLORES = ["primario", "primarioTexto", "secundario"];

const sinColores = (base: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(base).filter(([clave]) => !COLORES.includes(clave)),
  );

export function crearRestablecerColores(repositorio: RepositorioDeMarca) {
  return async function restablecerColores(
    contexto: ContextoActual,
  ): Promise<void> {
    if (!puedeCambiarMarca(contexto.usuario.rol)) throw new NoAutorizadoError();

    await escribirMarcaCompuesta(repositorio, contexto, sinColores);
  };
}
