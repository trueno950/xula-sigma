import ts from "typescript";
import { esTypeScript } from "../comunes";
import type { Metrica } from "../tipos";

/**
 * Las cuatro filas de la tabla "Metricas" de AGENTS.md que un patron decide
 * solo.
 *
 * No son antipatrones: no tienen numero en la tabla de 25. Viven aparte, en
 * su propia lista, por la misma razon que los antipatrones viven en la
 * suya: un chequeo que corre y da el mismo resultado siempre no tiene por
 * que pagar un revisor de IA que tarda minutos y no coincide consigo mismo
 * entre dos corridas.
 *
 * De las cuatro metricas, estas dos son las que se deciden sin criterio
 * subjetivo. "Lineas por archivo" es un conteo; "parametros" los cuenta el
 * compilador de TypeScript, no un escaneo lexico a mano. "Lineas por
 * funcion" y "profundidad de anidacion" piden medir el cuerpo contando
 * llaves y quedan con el revisor de IA (antipatron 15, la anidacion, ya
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
 * Deuda preexistente de parametros: funciones que ya recibian mas de tres
 * cuando la metrica entro al verificador. Se listan por `ruta:linea` para no
 * esconder violaciones futuras en el mismo archivo; arreglar una es borrar su
 * entrada.
 *
 * - `emitirConstancia.ts:46` — `crearEmitirConstancia`, fabrica de DI con
 *   cinco dependencias (el patron de composicion del modulo).
 * - `persona.ts:25` — el constructor privado de `Persona`, cuatro campos de
 *   identidad de un value object inmutable.
 */
const DEUDA_DE_PARAMS = new Set([
  "src/modules/constancias/application/emitirConstancia.ts:46",
  "src/modules/padron/domain/persona.ts:25",
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
 * Las declaraciones de funcion con cuerpo: `function`, `=>`, metodos y
 * constructores. Quedan afuera las anotaciones de tipo (`FunctionTypeNode`,
 * `MethodSignature`, `CallSignature`), que son tipos y no funciones.
 */
const esFuncionDeValor = (
  nodo: ts.Node,
): nodo is
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.ConstructorDeclaration =>
  ts.isFunctionDeclaration(nodo) ||
  ts.isFunctionExpression(nodo) ||
  ts.isArrowFunction(nodo) ||
  ts.isMethodDeclaration(nodo) ||
  ts.isConstructorDeclaration(nodo);

/**
 * Las funciones de valor con mas de 3 parametros, contadas por el compilador
 * de TypeScript. El parser distingue solo: una firma de tipo (`(a, b) =>
 * void`) no es una `ArrowFunction`, es un `FunctionTypeNode`, asi que la
 * cuenta de parametros es exacta sin escaneos a mano ni casos borde.
 */
const funcionesConMuchosParametros = (
  ruta: string,
  contenido: string,
): Array<{ linea: number; total: number }> => {
  const fuente = ts.createSourceFile(
    ruta,
    contenido,
    ts.ScriptTarget.Latest,
    true,
    ruta.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const resultado: Array<{ linea: number; total: number }> = [];

  const visitar = (nodo: ts.Node): void => {
    if (esFuncionDeValor(nodo) && nodo.parameters.length > 3) {
      const { line } = fuente.getLineAndCharacterOfPosition(nodo.getStart());
      resultado.push({ linea: line + 1, total: nodo.parameters.length });
    }
    ts.forEachChild(nodo, visitar);
  };

  visitar(fuente);
  return resultado;
};

export const demasiadosParametros: Metrica = {
  id: "metrica-params-3",
  titulo: "Funcion con mas de 3 parametros",
  limite: "<= 3",
  revisar(archivos) {
    const hallazgos = [];

    for (const archivo of archivos) {
      if (!esCodigoDeMetrica(archivo.ruta)) continue;

      for (const { linea, total } of funcionesConMuchosParametros(
        archivo.ruta,
        archivo.contenido,
      )) {
        if (DEUDA_DE_PARAMS.has(`${archivo.ruta}:${linea}`)) continue;

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
