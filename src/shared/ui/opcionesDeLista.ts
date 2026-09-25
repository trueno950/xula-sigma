import type { OpcionDeLista } from "./CampoDeLista";

/**
 * Las opciones de un `<select>` sobre un catalogo cerrado: el `value` sigue
 * siendo el codigo -es lo que viaja en el formulario y en la URL- y solo la
 * etiqueta cambia. `Record<T, string>` obliga a que la tabla cubra cada
 * miembro que se ofrece.
 */
export const opcionesEtiquetadas = <T extends string>(
  codigos: readonly T[],
  etiquetas: Readonly<Record<T, string>>,
): readonly OpcionDeLista[] =>
  codigos.map((codigo) => ({ valor: codigo, etiqueta: etiquetas[codigo] }));
