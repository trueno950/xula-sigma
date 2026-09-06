/**
 * Estado del listado del panel (`design.md`, "Filtros"), derivado de
 * `canceladaEn` y no una columna propia: VIGENTE es `canceladaEn IS NULL`,
 * CANCELADA lo contrario. La traduccion a `WHERE` vive en infrastructure
 * (`listadoDeConstanciasSql.ts`), nunca aca -este archivo es dominio puro,
 * sin Drizzle.
 */
export const ESTADOS_DE_CONSTANCIA = ["VIGENTE", "CANCELADA"] as const;

export type EstadoDeConstancia = (typeof ESTADOS_DE_CONSTANCIA)[number];
