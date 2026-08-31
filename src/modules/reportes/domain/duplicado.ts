import { DuplicadoDeSiMismoError } from "./errores";

/** Lo minimo del candidato a original: un salto, no la fila entera (design.md seccion 8). */
export type CandidatoAOriginal = {
  readonly id: string;
  readonly duplicadoDeReporteId: string | null;
};

/**
 * El original de una cadena, en UN salto.
 *
 * No hay bucle porque no hace falta: el invariante dice que un duplicado
 * apunta siempre a un no-duplicado, asi que dereferenciar una vez alcanza.
 * Es total: para cualquier entrada devuelve un string y termina.
 */
export const originalDe = (candidato: CandidatoAOriginal): string =>
  candidato.duplicadoDeReporteId ?? candidato.id;

/** Resuelve el original y rechaza el unico caso que `originalDe` no puede ver. */
export const vincularDuplicado = (
  reporteId: string,
  candidato: CandidatoAOriginal,
): string => {
  const original = originalDe(candidato);
  if (original === reporteId) throw new DuplicadoDeSiMismoError();
  return original;
};
