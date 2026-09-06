import type { OpcionDeLista } from "@/shared/ui";

/**
 * Como se lee el catalogo cerrado de estado dentro de un `<select>`. Mismo
 * criterio que `reportes/ui/opciones.ts`.
 */
export const opcionesDeCatalogo = (
  valores: readonly string[],
): readonly OpcionDeLista[] =>
  valores.map((valor) => ({ valor, etiqueta: valor }));
