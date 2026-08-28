import { esSql, esTypeScript, lineaDe } from "../comunes";
import type { Regla } from "../tipos";

/**
 * Las tres salidas sancionadas de la regla 2, mas los ayudantes de prueba
 * que siembran municipios antes de que exista un tenant.
 *
 * La lista existe porque el directorio entero no alcanza como permiso. La
 * regla 2 de AGENTS.md dice que hay **tres** excepciones y que "no se usa
 * una cuarta sin actualizar la regla"; bendecir `shared/tenancy/` completo
 * dejaba entrar una cuarta en silencio. Con la lista, abrir una salida
 * nueva obliga a tocar este archivo, que es exactamente lo que la regla
 * pide.
 *
 * `municipiosDePrueba` y `superAdminDePrueba` no son salidas de produccion:
 * arman el escenario de los tests de aislamiento. Estan nombrados igual
 * porque el patron no distingue una cosa de la otra, y una lista honesta
 * vale mas que un permiso implicito.
 */
const SALIDAS_CON_DRIVER = new Set([
  "src/shared/tenancy/withTenant.ts",
  "src/shared/tenancy/provision.ts",
  "src/shared/tenancy/municipiosDePrueba.ts",
  "src/shared/tenancy/superAdminDePrueba.ts",
  "src/shared/tenancy/esquema.isolation.test.ts",
]);

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

      const patron = /from\s+["'](postgres|drizzle-orm\/postgres-js)["']/g;

      for (const encontrado of archivo.contenido.matchAll(patron)) {
        hallazgos.push({
          ruta: archivo.ruta,
          linea: lineaDe(archivo.contenido, encontrado.index),
          mensaje: `Importa \`${encontrado[1]}\` directo. El acceso a la base va por \`shared/tenancy\`, y las salidas con driver son la lista de \`tenancia.ts\`.`,
        });
      }
    }

    return hallazgos;
  },
};

/**
 * `SET` sin `LOCAL` sobrevive a la transaccion, se queda pegado en la
 * conexion del pooler y lo hereda el siguiente request, que puede ser de
 * otro municipio.
 *
 * Mira parametros con punto —`app.tenant`— y no cualquier `SET`. Sin esa
 * restriccion, `ON DELETE SET NULL` y `ALTER COLUMN ... SET DEFAULT`
 * marcarian en cada migracion, y una regla que grita sobre codigo sano se
 * termina desactivando.
 */
export const setSinLocal: Regla = {
  id: "set-local",
  antipatron: 3,
  titulo: "SET de parametro de sesion sin LOCAL",
  revisar(archivos) {
    const hallazgos = [];

    for (const archivo of archivos) {
      if (!esTypeScript(archivo.ruta) && !esSql(archivo.ruta)) continue;

      const patron =
        /\bSET\s+(?!LOCAL\b)([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)\s*(?:=|\bTO\b)/gi;

      for (const encontrado of archivo.contenido.matchAll(patron)) {
        hallazgos.push({
          ruta: archivo.ruta,
          linea: lineaDe(archivo.contenido, encontrado.index),
          mensaje: `\`SET ${encontrado[1]}\` sin \`LOCAL\`: sobrevive a la transaccion y lo hereda el proximo request.`,
        });
      }
    }

    return hallazgos;
  },
};
