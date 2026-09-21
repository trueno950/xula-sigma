export const lineaDe = (contenido: string, indice: number): number =>
  contenido.slice(0, indice).split("\n").length;

// Mismo patron que `esAndamiajeDePrueba` de tenancia.ts: un `*DePrueba.ts`
// abre su propia conexion y lee fixtures, igual que un `*.test.ts`.
export const esTest = (ruta: string): boolean =>
  /\.test\.tsx?$|DePrueba\.ts$/.test(ruta);

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

/**
 * Los argumentos de una llamada, contando parentesis.
 *
 * Una expresion regular no puede cruzar un parentesis anidado, y en este
 * repositorio el valor de `set_config` a veces es una subconsulta entera
 * —`scripts/plataforma-admin.sql:31`—. Con `[^)]*` el match se frenaba en el
 * parentesis de adentro y nunca llegaba al tercer argumento, que es el unico
 * que importa. Contar profundidad es la unica forma honesta.
 *
 * `desde` es el indice del parentesis que abre. Devuelve null si no cierra.
 */
export const argumentosDeLlamada = (
  texto: string,
  desde: number,
): string | null => {
  let profundidad = 0;

  for (let i = desde; i < texto.length; i++) {
    if (texto[i] === "(") profundidad++;
    else if (texto[i] === ")") {
      profundidad--;
      if (profundidad === 0) return texto.slice(desde + 1, i);
    }
  }

  return null;
};

/** Parte por las comas del nivel exterior, ignorando las de adentro. */
export const porComasExternas = (argumentos: string): string[] => {
  const partes: string[] = [];
  let profundidad = 0;
  let actual = "";

  for (const caracter of argumentos) {
    if (caracter === "(") profundidad++;
    if (caracter === ")") profundidad--;

    if (caracter === "," && profundidad === 0) {
      partes.push(actual);
      actual = "";
      continue;
    }

    actual += caracter;
  }

  partes.push(actual);

  return partes.map((parte) => parte.trim());
};
