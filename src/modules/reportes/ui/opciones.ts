import type { OpcionDeLista } from "@/shared/ui";

/**
 * Como se leen los catalogos cerrados del modulo dentro de un `<select>`.
 * Mismo criterio que `territorio/ui/opciones.ts`: un solo lugar para que
 * `FormularioDeAlta` y `AccionesDeReporte` lean el mismo catalogo igual.
 */
export const opcionesDeCatalogo = (
  valores: readonly string[],
): readonly OpcionDeLista[] =>
  valores.map((valor) => ({ valor, etiqueta: valor }));
