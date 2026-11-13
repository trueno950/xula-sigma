import { porcionesDeConstancias } from "@/modules/constancias";
import { porcionesDeIntervenciones } from "@/modules/intervenciones";
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
 * Lo consume `descargaDeDatos.ts`, que es lo que corre
 * `GET /exportacion/descarga`. Cada modulo suma su porcion conforme se
 * construye (`ROADMAP.md`, seccion 4, "Exportacion por ayuntamiento"); que
 * este arreglo crezca es el estado esperado.
 */
export const porciones: readonly PorcionExportable[] = [
  porcionDePadron,
  ...porcionesDeTerritorio,
  ...porcionesDeConstancias,
  ...porcionesDeReportes,
  ...porcionesDeIntervenciones,
];
