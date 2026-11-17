import type { RecursoDeMapa } from "../domain";

/**
 * Como se nombra un hecho cuando el renglon no lo dice: el nombre accesible
 * del enlace al detalle. La fila muestra el folio -o el tipo, si es una
 * obra-, y un lector de pantalla necesita saber que eso es un reporte o una
 * intervencion antes de abrirlo.
 */
const ETIQUETAS: Readonly<Record<RecursoDeMapa, string>> = {
  REPORTE: "Reporte ciudadano",
  INTERVENCION: "Intervención municipal",
};

export const etiquetaDeRecurso = (recurso: RecursoDeMapa): string =>
  ETIQUETAS[recurso];
