import { porcionesDeConstancias } from "@/modules/constancias";
import { porcionDePadron } from "@/modules/padron";
import { porcionesDeReportes } from "@/modules/reportes";
import { porcionesDeTerritorio } from "@/modules/territorio";
import type { PorcionExportable } from "@/shared/exportacion/exportar";

/**
 * Composicion de exportacion (design.md decision 6): un arreglo, no un
 * `switch`. Agregar un modulo es un import y un elemento — no hay rama que
 * crezca, no hay nombre que registrar en dos lados.
 *
 * Por que vive en `src/app` y no en `shared`: el `@param porciones` de
 * `exportarAyuntamiento` (`exportar.ts`).
 *
 * Todavia no hay ruta que consuma este arreglo: la exportacion completa por
 * ayuntamiento es el cierre del `ROADMAP.md` (seccion 4, "Exportacion por
 * ayuntamiento"), donde cada modulo suma su porcion conforme se construye.
 * Que `grep` no encuentre llamador es el estado esperado hasta que exista esa
 * pantalla, no una senal de codigo muerto.
 */
export const porciones: readonly PorcionExportable[] = [
  porcionDePadron,
  ...porcionesDeTerritorio,
  ...porcionesDeConstancias,
  ...porcionesDeReportes,
];
