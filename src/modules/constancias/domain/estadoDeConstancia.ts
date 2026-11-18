/**
 * Estado del listado del panel (`design.md`, "Filtros"), derivado de
 * `canceladaEn` y no una columna propia: VIGENTE es `canceladaEn IS NULL`,
 * CANCELADA lo contrario. La traduccion a `WHERE` vive en infrastructure
 * (`listadoDeConstanciasSql.ts`), nunca aca -este archivo es dominio puro,
 * sin Drizzle.
 */
export const ESTADOS_DE_CONSTANCIA = ["VIGENTE", "CANCELADA"] as const;

export type EstadoDeConstancia = (typeof ESTADOS_DE_CONSTANCIA)[number];

/**
 * El estado de una constancia ya guardada: `listaConstancias` y el detalle
 * lo necesitan tipado en el modelo de lectura, y la unica fuente es
 * `canceladaEn` -la columna que el listado ya traduce a `WHERE` en
 * `infrastructure`-.
 */
export const derivarEstadoDeConstancia = (
  canceladaEn: Date | null,
): EstadoDeConstancia => (canceladaEn === null ? "VIGENTE" : "CANCELADA");
