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
          // Una sola conexion en el pool. Sin esto, el test de fuga entre
          // requests no prueba nada: la segunda consulta caeria en otra
          // conexion y pasaria por casualidad, no porque `SET LOCAL` haya
          // muerto con la transaccion.
          env: { DB_POOL_MAX: "1" },
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/modules/**/domain/**", "src/modules/**/application/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
