import { porcionDePadron } from "@/modules/padron";
import { porcionesDeTerritorio } from "@/modules/territorio";
import type { PorcionExportable } from "@/shared/exportacion/exportar";

/**
 * Composicion de exportacion (design.md decision 6): un arreglo, no un
 * `switch`. Agregar un modulo es un import y un elemento — no hay rama que
 * crezca, no hay nombre que registrar en dos lados.
 *
 * Por que vive en `src/app` y no en `shared`: el `@param porciones` de
 * `exportarAyuntamiento` (`exportar.ts`).
 */
export const porciones: readonly PorcionExportable[] = [
  porcionDePadron,
  ...porcionesDeTerritorio,
];
