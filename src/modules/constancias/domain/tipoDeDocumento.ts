/**
 * Union cerrada de tipos de documento. Arranca con uno solo -la constancia
 * de vecindad- porque es el unico tramite que cubre esta fase (proposal.md).
 * `PREFIJOS` es un `Record` total sobre la union: agregar un tipo nuevo sin
 * su fila obliga a TypeScript a marcar el error, y el test de dominio lo
 * confirma en tiempo de ejecucion recorriendo `TIPOS_DE_DOCUMENTO` entero.
 */
export const TIPOS_DE_DOCUMENTO = ["VECINDAD"] as const;

export type TipoDeDocumento = (typeof TIPOS_DE_DOCUMENTO)[number];

export const PREFIJOS: Record<TipoDeDocumento, string> = {
  VECINDAD: "VEC",
};
