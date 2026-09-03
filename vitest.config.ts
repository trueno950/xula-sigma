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
          // `scripts/` entra aca y no en un proyecto propio: sus tests no
          // tocan la base, que es exactamente el contrato de `unit`. El
          // verificador de reglas vive ahi porque es herramienta, no
          // aplicacion; por eso tampoco entra en `coverage.include`.
          include: [
            "src/**/*.test.ts",
            "src/**/*.test.tsx",
            "scripts/**/*.test.ts",
          ],
          env: {
            // `ritmo.ts` lo exige al importarse. El de produccion sale del
            // entorno y nunca del repositorio.
            PIMIENTA_INTENTOS: "pimienta-de-prueba-no-usar-en-produccion",
            // `withTenant.ts` e `instancia.ts` (Better Auth) exigen los dos
            // siguientes al importarse, no al usarse. Un caso de uso que
            // abre su propia transaccion (`altaDePersona.ts`, precedente
            // `cambiarEscudo.ts`) o una Server Action que llama
            // `contextoActual()` arrastra ese import con solo importar el
            // barrel del modulo, aunque el test -como
            // `superficiePublica.test.ts`- nunca dialogue con ninguno de
            // los dos. Ningun test de `unit` abre una conexion real, asi
            // que `DATABASE_URL` no importa mas que existir.
            //
            // `BETTER_AUTH_SECRET` es distinto desde `respaldoDeHost.ts`:
            // `proxy.test.ts` y `proxyRespaldo.test.ts` SI firman y
            // verifican una cookie con este valor -no hace falta que
            // coincida con ningun secreto real, solo que firmar y
            // verificar usen el mismo-.
            DATABASE_URL: "postgresql://no-se-usa@localhost:1/no-se-usa",
            BETTER_AUTH_SECRET: "secreto-de-prueba-no-usar-en-produccion",
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
        /**
         * Los componentes de `shared/ui` quedan afuera por la misma razon
         * que `esquema.ts`: son declaraciones. La logica que si decide algo
         * —que variante de boton, cual de los dos vacios, si el filtro
         * conto— vive en `estilos.ts` y `estadoDeLista.ts`, que son `.ts`,
         * entran al piso y tienen sus tests.
         *
         * Cubrir el `.tsx` pediria montar un DOM y una libreria de
         * renderizado nueva para afirmar que un `<button>` recibio las
         * clases que la funcion de al lado ya devolvio. Eso es medir el
         * numero, no la garantia; lo que de verdad prueba estas pantallas
         * es el E2E de Playwright.
         */
        "src/shared/ui/**/*.tsx",
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
