import type { OpcionDeLista } from "@/shared/ui";

/** Las calles de un asentamiento, con el nombre que las rotula. */
export type GrupoDeCalles = {
  asentamientoId: string;
  asentamiento: string;
  opciones: readonly OpcionDeLista[];
};

/**
 * Lo que el campo de Calle recibe del servidor: una vez las calles del
 * municipio -agrupadas por el asentamiento que las tiene en su catalogo- y,
 * aparte, que asentamiento le toca a cada lugar del select.
 *
 * Se manda una sola vez cada calle y no una copia por lugar: un asentamiento
 * con cinco colonias repetiria sus calles cinco veces en el mismo HTML.
 */
export type CallesDelAlta = {
  /** El asentamiento de cada lugar ofrecido; ausente si no resuelve a ninguno. */
  asentamientoDeLugar: Readonly<Record<string, string | undefined>>;
  grupos: readonly GrupoDeCalles[];
};

/**
 * Que ofrece el campo de Calle. La regla -la calle cuelga del asentamiento del
 * lugar elegido, S6 de `intervenciones-ux`- vive en `callesAOfrecer`, abajo;
 * esto es solo su forma.
 */
export type OfertaDeCalles =
  | { forma: "grupos"; grupos: readonly GrupoDeCalles[] }
  | { forma: "lista"; opciones: readonly OpcionDeLista[] };

/** Descarta los asentamientos sin calles: un `<optgroup>` vacio no se ve. */
export const gruposDeCalles = (
  grupos: readonly GrupoDeCalles[],
): readonly GrupoDeCalles[] =>
  grupos.filter((grupo) => grupo.opciones.length > 0);

export const callesAOfrecer = (
  calles: CallesDelAlta,
  lugarId: string,
): OfertaDeCalles => {
  if (!lugarId) return { forma: "grupos", grupos: calles.grupos };

  const asentamientoId = calles.asentamientoDeLugar[lugarId];
  const grupo = calles.grupos.find(
    (candidato) => candidato.asentamientoId === asentamientoId,
  );

  return { forma: "lista", opciones: grupo?.opciones ?? [] };
};
