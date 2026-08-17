import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Los proyectos separan por costo, no por capricho.
 *
 * `unit` corre sin base de datos: dominio y casos de uso con puertos
 * mockeados. Es lo que corre en cada guardado.
 *
 * `integration` necesita Postgres real, e incluye los tests de aislamiento
 * entre municipios. Esos no se pueden simular: la garantia la da RLS, y RLS
 * solo existe en la base.
 */
export default defineConfig({
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "./src") },
  },
  test: {
    globals: false,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          env: {
            // `ritmo.ts` lo exige al importarse, igual que
            // `BETTER_AUTH_SECRET` en integracion. El de produccion sale del
            // entorno y nunca del repositorio.
            PIMIENTA_INTENTOS: "pimienta-de-prueba-no-usar-en-produccion",
          },
          // `*` tambien captura `algo.isolation`, asi que sin este exclude
          // los tests de aislamiento correrian aca, en una suite que por
          // contrato no tiene base de datos.
          exclude: [
            "src/**/*.integration.test.ts",
            "src/**/*.isolation.test.ts",
          ],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: [
            "src/**/*.integration.test.ts",
            "src/**/*.isolation.test.ts",
          ],
          environment: "node",
          fileParallelism: false,
          env: {
            // Una sola conexion en el pool. Sin esto, el test de fuga entre
            // requests no prueba nada: la segunda consulta caeria en otra
            // conexion y pasaria por casualidad, no porque `SET LOCAL` haya
            // muerto con la transaccion.
            DB_POOL_MAX: "1",
            // `instancia.ts` lo exige al importarse. Valor de prueba: el de
            // produccion sale del entorno y nunca del repositorio.
            BETTER_AUTH_SECRET: "secreto-de-prueba-no-usar-en-produccion",
            PIMIENTA_INTENTOS: "pimienta-de-prueba-no-usar-en-produccion",
          },
        },
      },
    ],
    /**
     * El piso corre con la suite COMPLETA, en el job que tiene Postgres.
     *
     * Medido, no supuesto: con `include` apuntando solo a `src/modules/**`
     * —vacio hasta hoy— la reja daba `0/0` y salia con codigo 0. Un piso de
     * 80% sobre cero archivos es exactamente el modo de falla que este
     * proyecto documenta: un chequeo que siempre pasa. Encima
     * `@vitest/coverage-v8` no estaba instalado, asi que el job de CI ni
     * llegaba a medir.
     *
     * Corre sobre la suite completa porque casi todo `shared/` se prueba
     * contra Postgres. Midiendo solo `unit`, `withTenant` y `provision`
     * daban 0% teniendo sus tests de aislamiento en verde, y la unica forma
     * de subir el numero habria sido escribir tests unitarios que no
     * prueban RLS. La reja tiene que empujar hacia el test que sirve.
     */
    coverage: {
      provider: "v8",
      include: [
        "src/modules/**/domain/**",
        "src/modules/**/application/**",
        "src/shared/**",
      ],
      /**
       * Fuera quedan las declaraciones, no la logica.
       *
       * `esquema.ts`, `configuracion.ts` y `politicasPlataforma.ts` son
       * tablas, politicas y opciones: no tienen caminos de decision. Su
       * prueba es el `*.isolation.test.ts` que le pregunta a Postgres, y
       * eso ninguna linea ejecutada lo demuestra. Dejarlos adentro solo
       * premiaba importarlos.
       */
      exclude: [
        "src/shared/**/esquema.ts",
        "src/shared/auth/configuracion.ts",
        "src/shared/auth/politicasPlataforma.ts",
        "src/shared/**/*DePrueba.ts",
        "src/shared/**/index.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        /**
         * 75 y no 80, con la deuda escrita: lo que falta son las guardas de
         * variable de entorno (`if (!url) throw`) que corren al importar el
         * modulo. Cubrirlas pide `resetModules` y reimportar con el entorno
         * roto. Son caminos reales y el numero sube a 80 cuando se escriban;
         * ponerlo en 80 hoy, sin esos tests, dejaba el commit rojo por algo
         * que este PR no introdujo.
         */
        branches: 75,
      },
    },
  },
});
