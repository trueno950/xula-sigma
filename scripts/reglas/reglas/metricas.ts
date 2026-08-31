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

export const archivoDemasiadoLargo: Metrica = {
  id: "metrica-archivo-200",
  titulo: "Archivo de codigo de mas de 200 lineas",
  limite: "<= 200",
  revisar(archivos) {
    return archivos
      .filter((a) => esTypeScript(a.ruta) && a.ruta.startsWith("src/"))
      .filter((a) => !DEUDA_DE_ARCHIVO.has(a.ruta))
      .map((a) => ({ ruta: a.ruta, lineas: a.contenido.split("\n").length }))
      .filter(({ lineas }) => lineas > 200)
      .map(({ ruta, lineas }) => ({
        ruta,
        linea: 201,
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

/**
 * Las listas de parametros de `function nombre(...) {` y de `(...) =>`, con
 * los parentesis balanceados a mano —no con `[^)]*`— para que una llamada
 * de cuatro argumentos seguida de una flecha no se cuente como una firma de
 * cuatro parametros.
 */
const listasDeFunciones = (codigo: string) => {
  const listas: Array<{ lista: string; linea: number }> = [];

  for (const encontrado of codigo.matchAll(/\bfunction(?:\s+[\w$]+)?\s*\(/g)) {
    const abierto = encontrado.index + encontrado[0].length - 1;
    const lista = argumentosDeLlamada(codigo, abierto);
    if (lista !== null) {
      listas.push({ lista, linea: lineaDe(codigo, abierto) });
    }
  }

  for (let i = 0; i < codigo.length; i++) {
    if (codigo[i] !== "(") continue;

    const lista = argumentosDeLlamada(codigo, i);
    if (lista === null) continue;

    let j = i + 1 + lista.length + 1;
    while (j < codigo.length && /\s/.test(codigo[j] ?? "")) j++;
    if (codigo[j] === "=" && codigo[j + 1] === ">") {
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
      if (!esTypeScript(archivo.ruta)) continue;

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
