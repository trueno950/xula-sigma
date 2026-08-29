import {
  argumentosDeLlamada,
  esSql,
  esTypeScript,
  lineaDe,
  porComasExternas,
  sinComentarios,
} from "../comunes";
import type { Regla } from "../tipos";

/**
 * Las salidas de produccion que abren conexion propia. Son las dos que
 * alojan las tres excepciones de la regla 2 de AGENTS.md, y nada mas.
 *
 * La lista es de DOS archivos y no de cinco a proposito. La version anterior
 * incluia el andamiaje de prueba, y eso convertia esta constante en una
 * segunda enumeracion de "quien puede tocar la base" que ya divergia de la
 * canonica: la regla 2 dice tres excepciones, el checker permitia cinco. La
 * regla 2 existe justamente porque esa lista llego a estar copiada en seis
 * lugares. Copiarla aca con otro contenido era repetir el defecto adentro
 * del verificador que deberia impedirlo.
 *
 * Abrir una salida de produccion nueva obliga a tocar estas dos lineas, que
 * es lo que la regla pide al decir que no se usa una cuarta sin
 * actualizarla.
 */
const SALIDAS_CON_DRIVER = new Set([
  "src/shared/tenancy/withTenant.ts",
  "src/shared/tenancy/provision.ts",
]);

/**
 * El andamiaje de prueba no es una salida: siembra municipios y arma el
 * escenario de los tests de aislamiento. No sirve ningun request.
 *
 * Se reconoce por el nombre y no por una lista, para que agregar un ayudante
 * nuevo no pida editar este archivo ni haga divergir nada. Es el mismo
 * criterio con el que `assets-filesystem` deja pasar los tests que leen
 * fixtures: la categoria se decide por lo que el archivo ES, no por
 * enumerarlo.
 */
const esAndamiajeDePrueba = (ruta: string): boolean =>
  /DePrueba\.ts$|\.isolation\.test\.ts$/.test(ruta);

/**
 * El driver, no el constructor de consultas.
 *
 * `drizzle-orm` a secas exporta `eq`, `and`, `sql`: lo importa cada
 * repositorio y no abre ninguna conexion. Lo que abre conexion es el
 * paquete `postgres` y el adaptador `drizzle-orm/postgres-js`.
 *
 * El alcance es parte de la regla: AGENTS.md dice "en `src/`". El andamiaje
 * de E2E y los scripts de mantenimiento siembran la base antes de que exista
 * un tenant contra el cual abrir una sesion.
 */
export const driverFueraDeTenancy: Regla = {
  id: "tenancy-driver",
  antipatron: 2,
  titulo: "Conexion a base de datos fuera de las salidas sancionadas",
  revisar(archivos) {
    const hallazgos = [];

    for (const archivo of archivos) {
      if (!esTypeScript(archivo.ruta)) continue;
      if (!archivo.ruta.startsWith("src/")) continue;
      if (SALIDAS_CON_DRIVER.has(archivo.ruta)) continue;
      if (esAndamiajeDePrueba(archivo.ruta)) continue;

      const patron = /from\s+["'](postgres|drizzle-orm\/postgres-js)["']/g;

      for (const encontrado of archivo.contenido.matchAll(patron)) {
        hallazgos.push({
          ruta: archivo.ruta,
          linea: lineaDe(archivo.contenido, encontrado.index),
          mensaje: `Importa \`${encontrado[1]}\` directo. El acceso a la base va por \`shared/tenancy\`, y las salidas de produccion con driver son las dos de \`tenancia.ts\`.`,
        });
      }
    }

    return hallazgos;
  },
};

/**
 * Lo que sobrevive a la transaccion se queda pegado en la conexion del
 * pooler y lo hereda el siguiente request, que puede ser de otro municipio.
 * Es el escenario T2 de los invariantes, y es una fuga silenciosa.
 *
 * La regla mira DOS formas, y la segunda es la que importa en este
 * repositorio:
 *
 * 1. `SET app.tenant = ...` sin `LOCAL`. Es lo que dice el antipatron 3 y
 *    aca no lo escribe nadie: `withTenant.ts:117` explica que `SET LOCAL
 *    app.tenant = $1` ni siquiera existe, porque la sintaxis SET no acepta
 *    parametros. Queda por si alguien escribe SQL a mano.
 *
 * 2. `set_config('app.tenant', valor, false)`. **Este es el vector real.**
 *    El tercer argumento es el que dice "local a la transaccion": con
 *    `true` muere en el COMMIT, con `false` sobrevive. Las quince llamadas
 *    del repositorio usan `true`, y `false` esta a un caracter de
 *    distancia.
 *
 * La primera version de esta regla solo miraba la forma 1, o sea que
 * verificaba una sintaxis que este codigo nunca usa y no veia la unica que
 * si usa. Una reja que no puede fallar es peor que no tenerla, porque
 * ademas da confianza. Lo encontro la revision de IA, que es exactamente el
 * trabajo que un patron no hace solo: leer como fija el tenant este
 * proyecto en vez de como lo describe el documento.
 */
/**
 * `is_local` es un `boolean`, y la reja pregunta si el argumento prueba que
 * muere en el COMMIT — no si prueba lo contrario.
 *
 * Verificado contra Postgres 17 (`pg_proc`: `pronargs 3, pronargdefaults 0`):
 * no hay sobrecarga de dos argumentos, asi que omitir el tercero no es una
 * fuga silenciosa sino un error ruidoso. Pero `0::boolean`, `'FALSE'` y
 * `'f'` fijan la variable a nivel de sesion sin decir `false` en ningun
 * lado, y un argumento calculado no se puede decidir leyendo el archivo.
 * Buscar el literal `false` los dejaba pasar a todos.
 *
 * Falla cerrado a proposito: sobre el aislamiento entre municipios, un falso
 * positivo cuesta una linea de discusion y un falso negativo cuesta el
 * negocio. Hoy las quince llamadas del repositorio escriben `true` pelado,
 * asi que el costo real es cero.
 */
const pruebaQueEsLocal = (argumento: string): boolean =>
  /^(?:'|")?(?:t|true)(?:'|")?$/i.test(argumento.trim());

/**
 * `set_config` con parentesis contados, no con una expresion regular.
 *
 * El valor puede ser una subconsulta con sus propios parentesis —es la forma
 * de `scripts/plataforma-admin.sql:31`— y ahi `[^)]*` se frenaba antes de
 * llegar al tercer argumento, que es el unico que decide si la variable
 * muere en el COMMIT. La fuga se colaba justo en la forma que el repositorio
 * escribe de verdad.
 */
const configuracionesNoLocales = (codigo: string, ruta: string) => {
  const hallazgos = [];

  for (const encontrado of codigo.matchAll(/set_config\s*\(/gi)) {
    const abre = encontrado.index + encontrado[0].length - 1;
    const argumentos = argumentosDeLlamada(codigo, abre);
    if (argumentos === null) continue;

    const partes = porComasExternas(argumentos);
    if (pruebaQueEsLocal(partes[2] ?? "")) continue;

    const parametro = /['"`]([^'"`]+)['"`]/.exec(partes[0] ?? "");

    // El mensaje no reproduce la forma de la llamada a proposito: si la
    // citara literal, esta misma linea seria un hallazgo. Es el limite de un
    // verificador escrito con los patrones que busca.
    hallazgos.push({
      ruta,
      linea: lineaDe(codigo, encontrado.index),
      mensaje: `\`set_config\` sobre \`${parametro?.[1] ?? "?"}\` con un tercer argumento que no prueba que sea local: sobrevive a la transaccion y lo hereda el proximo request. Va en \`true\`.`,
    });
  }

  return hallazgos;
};

export const setSinLocal: Regla = {
  id: "set-local",
  antipatron: 3,
  titulo: "Parametro de sesion que sobrevive a la transaccion",
  revisar(archivos) {
    const hallazgos = [];

    for (const archivo of archivos) {
      if (!esTypeScript(archivo.ruta) && !esSql(archivo.ruta)) continue;

      // Un comentario que describe la fuga no es la fuga. Las cadenas SI se
      // conservan: el SQL de este proyecto viaja adentro de template
      // literals, asi que ahi es donde hay que buscar.
      const codigo = sinComentarios(archivo.contenido);

      const setSuelto =
        /\bSET\s+(?!LOCAL\b)([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)\s*(?:=|\bTO\b)/gi;

      for (const encontrado of codigo.matchAll(setSuelto)) {
        hallazgos.push({
          ruta: archivo.ruta,
          linea: lineaDe(codigo, encontrado.index),
          mensaje: `\`SET ${encontrado[1]}\` sin \`LOCAL\`: sobrevive a la transaccion y lo hereda el proximo request.`,
        });
      }

      hallazgos.push(...configuracionesNoLocales(codigo, archivo.ruta));
    }

    return hallazgos;
  },
};
