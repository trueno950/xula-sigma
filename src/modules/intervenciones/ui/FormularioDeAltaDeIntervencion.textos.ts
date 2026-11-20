/**
 * El mínimo de la descripción, dicho dos veces desde un solo lugar (S7 de
 * `odd/tasks/intervenciones-ux.md`): la ayuda que se lee antes de escribir y
 * el error que devuelve el servidor cuando no se alcanza.
 *
 * El navegador no lo hace cumplir con `minLength`: su mensaje sale en el
 * idioma del navegador -en inglés en el equipo de la auditoría- y sin
 * JavaScript no hay mensaje propio que enseñar. Lo hace cumplir el servidor,
 * que contesta en español con `MENSAJE_DESCRIPCION_CORTA`.
 */
export const MINIMO_DE_DESCRIPCION = 10;

export const AYUDA_DE_DESCRIPCION = `Escriba al menos ${MINIMO_DE_DESCRIPCION} caracteres: qué se hizo, no quién lo pidió.`;

export const MENSAJE_DESCRIPCION_CORTA = `La descripción debe tener al menos ${MINIMO_DE_DESCRIPCION} caracteres.`;

/**
 * Los obligatorios se dicen en una línea, nombrando el único que no lo es, en
 * vez de con un asterisco por etiqueta: cambiaría el nombre accesible que
 * `e2e/` busca exacto, y es la forma que ya tiene el alta de reportes.
 */
export const AVISO_DE_OBLIGATORIOS =
  "Todos los campos son obligatorios, salvo la calle.";
