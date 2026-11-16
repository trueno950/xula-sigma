import type { RecursoDeMapa } from "../domain";

/**
 * Como se nombra un hecho segun donde se lea: la lista y la cobertura llevan
 * el nombre completo, porque ahi el renglon no tiene otro contexto; la
 * leyenda lleva el sufijo corto, porque su fila ya dice el tipo y el conteo.
 */
const ETIQUETAS: Readonly<
  Record<RecursoDeMapa, Readonly<Record<"lista" | "leyenda", string>>>
> = {
  REPORTE: { lista: "Reporte ciudadano", leyenda: "reporte" },
  INTERVENCION: { lista: "Intervención municipal", leyenda: "intervención" },
};

export const etiquetaDeRecurso = (
  recurso: RecursoDeMapa,
  variante: "lista" | "leyenda",
): string => ETIQUETAS[recurso][variante];
