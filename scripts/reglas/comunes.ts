export const lineaDe = (contenido: string, indice: number): number =>
  contenido.slice(0, indice).split("\n").length;

export const esTest = (ruta: string): boolean => /\.test\.tsx?$/.test(ruta);

export const esCodigoDeAplicacion = (ruta: string): boolean =>
  ruta.startsWith("src/") && !esTest(ruta);

export const esTypeScript = (ruta: string): boolean => /\.tsx?$/.test(ruta);

export const esSql = (ruta: string): boolean => ruta.endsWith(".sql");

export const escapar = (texto: string): string =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Deja el codigo sin comentarios ni cadenas, reemplazando cada uno por
 * espacios para no mover los indices —de ahi salen los numeros de linea.
 *
 * Es un barrido lexico aproximado, no un parser: no distingue una expresion
 * regular con `//` adentro de un comentario. Alcanza para lo unico que lo
 * usa, que es buscar declaraciones, y el costo de equivocarse es un falso
 * negativo, no una falsa alarma.
 */
export const sinComentariosNiCadenas = (contenido: string): string =>
  contenido.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g,
    (encontrado) => encontrado.replace(/[^\n]/g, " "),
  );

/**
 * Quita comentarios y deja las cadenas.
 *
 * `sinComentariosNiCadenas` no sirve para las reglas que buscan SQL: en este
 * proyecto el SQL viaja adentro de template literals, asi que borrar las
 * cadenas borraria justo lo que hay que revisar. Pero un comentario que
 * DESCRIBE una fuga no es una fuga — y sin esta funcion, el comentario que
 * explica `set_config(..., false)` se marca a si mismo.
 *
 * Cubre las tres formas que aparecen: `//` y `/* *\/` de TypeScript, y `--`
 * de SQL. Reemplaza por espacios para no mover los indices, de donde salen
 * los numeros de linea.
 */
export const sinComentarios = (contenido: string): string =>
  contenido.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|--[^\n]*/g, (encontrado) =>
    encontrado.replace(/[^\n]/g, " "),
  );
