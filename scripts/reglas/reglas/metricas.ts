import {
  argumentosDeLlamada,
  esTypeScript,
  lineaDe,
  sinComentariosNiCadenas,
} from "../comunes";
import type { Metrica } from "../tipos";

/**
 * Las cuatro filas de la tabla "Metricas" de AGENTS.md que un patron decide
 * solo.
 *
 * No son antipatrones: no tienen numero en la tabla de 25. Viven aparte, en
 * su propia lista, por la misma razon que los antipatrones viven en la
 * suya: un chequeo que corre en milisegundos y da el mismo resultado siempre
 * no tiene por que pagar un revisor de IA que tarda minutos y no coincide
 * consigo mismo entre dos corridas.
 *
 * De las cuatro metricas, estas dos son las que un patron decide sin
 * ambiguedad. "Lineas por funcion" y "profundidad de anidacion" piden medir
 * el cuerpo de una funcion contando llaves, que es parsear TypeScript y no
 * un patron: quedan con el revisor de IA (antipatron 15, la anidacion, ya
 * estaba ahi por eso).
 */

/**
 * Deuda preexistente: archivos que ya pasaban las 200 lineas el dia que la
 * metrica entro al verificador. Se listan para que la regla no rompa el
 * build de un dia para el otro; bajar cada uno a <= 200 es trabajo aparte y
 * el archivo que lo haga lo borra de aca. Un archivo nuevo no entra a esta
 * lista: se parte.
 */
const DEUDA_DE_ARCHIVO = new Set([
  "src/modules/constancias/folio.integration.test.ts",
  "src/modules/territorio/application/altaDeDomicilio.test.ts",
  "src/modules/constancias/application/emitirConstancia.test.ts",
  "src/shared/auth/restablecerContrasenia.integration.test.ts",
  "src/modules/territorio/application/registrarMudanza.test.ts",
  "src/shared/auth/ritmo.isolation.test.ts",
  "src/shared/auth/roles.test.ts",
]);

/**
 * Cuenta las lineas de un archivo. `split("\n")` deja un elemento vacio por
 * el salto de linea final que Biome exige, asi que un archivo de 200 lineas
 * daria 201 sin este ajuste.
 */
const contarLineas = (contenido: string): number => {
  const lineas = contenido.split("\n");
  return lineas[lineas.length - 1] === "" ? lineas.length - 1 : lineas.length;
};

/**
 * Las metricas gobiernan el codigo de aplicacion en `src/`, no los scripts:
 * los scripts son herramienta, no aplicacion, y un verificador que se marca
 * a si mismo es el modo de falla que `main.ts` ya excluye para su propio
 * corpus de prueba.
 */
const esCodigoDeMetrica = (ruta: string) =>
  esTypeScript(ruta) && ruta.startsWith("src/");

export const archivoDemasiadoLargo: Metrica = {
  id: "metrica-archivo-200",
  titulo: "Archivo de codigo de mas de 200 lineas",
  limite: "<= 200",
  revisar(archivos) {
    return archivos
      .filter((a) => esCodigoDeMetrica(a.ruta))
      .filter((a) => !DEUDA_DE_ARCHIVO.has(a.ruta))
      .map((a) => ({ ruta: a.ruta, lineas: contarLineas(a.contenido) }))
      .filter(({ lineas }) => lineas > 200)
      .map(({ ruta, lineas }) => ({
        ruta,
        // No hay una linea culpable unica: apunta a la ultima del archivo.
        linea: lineas,
        mensaje: `Tiene ${lineas} lineas; el limite es 200. Partilo por tema.`,
      }));
  },
};

/**
 * Cuenta los parametros de una lista, ignorando las comas que viven dentro
 * de parentesis, corchetes o llaves: una desestructuracion (`{ a, b }`) o un
 * tipo de objeto es UN parametro. Devuelve null cuando la lista es ambigua
 * (genericos `<...>`, unions `|`, defaults `=` o tipos de funcion `=>`),
 * donde la regla prefiere callarse antes que marcar de mas.
 */
const contarParametros = (lista: string): number | null => {
  if (/[<>=|]/.test(lista)) return null;

  const delta: Record<string, number> = {
    "(": 1,
    "[": 1,
    "{": 1,
    ")": -1,
    "]": -1,
    "}": -1,
  };
  let profundidad = 0;
  let comas = 0;

  for (const caracter of lista) {
    profundidad += delta[caracter] ?? 0;
    if (caracter === "," && profundidad === 0) comas++;
  }

  // Una coma colgante —el formateador la deja al final de cada linea de una
  // firma multilinea— no separa un parametro: contarla da uno de mas.
  if (comas > 0 && lista.endsWith(",")) comas--;

  return comas + 1;
};

/** El primer indice no-espacio desde `desde`, hacia adelante. */
const indiceDeNoEspacio = (codigo: string, desde: number): number => {
  let i = desde;
  while (i < codigo.length && /\s/.test(codigo[i] ?? "")) i++;
  return i;
};

/** El primer indice no-espacio desde `desde`, hacia atras. */
const indiceDeNoEspacioAtras = (codigo: string, desde: number): number => {
  let i = desde;
  while (i >= 0 && /\s/.test(codigo[i] ?? "")) i--;
  return i;
};

/**
 * Salta un bloque balanceado `abre...cierra` desde `desde` (que apunta al
 * caracter que abre) y devuelve el indice tras el cierre. Si no cierra,
 * devuelve el final del archivo.
 */
const finDeBloque = (
  codigo: string,
  desde: number,
  abre: string,
  cierra: string,
): number => {
  let profundidad = 0;
  let i = desde;
  while (i < codigo.length) {
    if (codigo[i] === abre) profundidad++;
    else if (codigo[i] === cierra) {
      profundidad--;
      if (profundidad === 0) return i + 1;
    }
    i++;
  }
  return codigo.length;
};

/** El indice tras el `;` que cierra el statement, a profundidad 0 de `()[]{}<>`. */
const finDeStatement = (codigo: string, desde: number): number => {
  let profundidad = 0;
  let i = desde;
  while (i < codigo.length) {
    const caracter = codigo[i] ?? "";
    if ("([{<".includes(caracter)) profundidad++;
    else if (")]}>".includes(caracter)) profundidad--;
    else if (caracter === ";" && profundidad === 0) return i + 1;
    i++;
  }
  return codigo.length;
};

/**
 * Rangos [inicio, fin) de `type X = ...;` e `interface X { ... }`. Dentro de
 * ellos un `(...) =>` es una anotacion de tipo de funcion, no una funcion de
 * valor.
 */
const rangosDeTipo = (codigo: string): Array<[number, number]> => {
  const rangos: Array<[number, number]> = [];

  for (const encontrado of codigo.matchAll(/\b(type|interface)\s+[\w$]+/g)) {
    const inicio = encontrado.index;
    let i = indiceDeNoEspacio(codigo, inicio + encontrado[0].length);

    if (codigo[i] === "<") i = finDeBloque(codigo, i, "<", ">");
    i = indiceDeNoEspacio(codigo, i);

    if (encontrado[1] === "interface") {
      if (codigo[i] === "{") {
        rangos.push([inicio, finDeBloque(codigo, i, "{", "}")]);
      }
    } else if (codigo[i] === "=") {
      rangos.push([inicio, finDeStatement(codigo, i + 1)]);
    }
  }

  return rangos;
};

/**
 * ¿El `(` en `indice` vive en una posicion de tipo? Un rango `type`/`interface`
 * o una anotacion (`:` inmediatamente antes) lo delatan. `{ clave: (...) => }`
 * y los ternarios se saltan de mas (falso negativo), nunca de menos.
 */
const esPosicionDeTipo = (
  codigo: string,
  indice: number,
  rangos: Array<[number, number]>,
): boolean =>
  rangos.some(([inicio, fin]) => indice >= inicio && indice < fin) ||
  codigo[indiceDeNoEspacioAtras(codigo, indice - 1)] === ":";

/**
 * Las listas de parametros de `function nombre(...) {` y de `(...) =>`, con
 * los parentesis balanceados a mano —no con `[^)]*`— para que una llamada de
 * cuatro argumentos seguida de una flecha no se cuente como una firma de
 * cuatro parametros. Las posiciones de tipo se descartan con
 * `esPosicionDeTipo`.
 */
const listasDeFunciones = (codigo: string) => {
  const listas: Array<{ lista: string; linea: number }> = [];
  const rangos = rangosDeTipo(codigo);

  for (const encontrado of codigo.matchAll(/\bfunction(?:\s+[\w$]+)?\s*\(/g)) {
    if (esPosicionDeTipo(codigo, encontrado.index, rangos)) continue;

    const abierto = encontrado.index + encontrado[0].length - 1;
    const lista = argumentosDeLlamada(codigo, abierto);
    if (lista !== null) listas.push({ lista, linea: lineaDe(codigo, abierto) });
  }

  for (let i = 0; i < codigo.length; i++) {
    if (codigo[i] !== "(") continue;
    if (esPosicionDeTipo(codigo, i, rangos)) continue;

    const lista = argumentosDeLlamada(codigo, i);
    if (lista === null) continue;

    const cola = indiceDeNoEspacio(codigo, i + 1 + lista.length + 1);
    if (codigo[cola] === "=" && codigo[cola + 1] === ">") {
      listas.push({ lista, linea: lineaDe(codigo, i) });
    }
  }

  return listas;
};

export const demasiadosParametros: Metrica = {
  id: "metrica-params-3",
  titulo: "Funcion con mas de 3 parametros",
  limite: "<= 3",
  revisar(archivos) {
    const hallazgos = [];

    for (const archivo of archivos) {
      if (!esCodigoDeMetrica(archivo.ruta)) continue;

      const codigo = sinComentariosNiCadenas(archivo.contenido);

      for (const { lista, linea } of listasDeFunciones(codigo)) {
        const total = contarParametros(lista.trim());
        if (total === null || total <= 3) continue;

        hallazgos.push({
          ruta: archivo.ruta,
          linea,
          mensaje: `Recibe ${total} parametros; mas de 3 van en un objeto.`,
        });
      }
    }

    return hallazgos;
  },
};

export const metricas: Metrica[] = [
  archivoDemasiadoLargo,
  demasiadosParametros,
];
