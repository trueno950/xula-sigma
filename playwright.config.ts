import { defineConfig, devices } from "@playwright/test";
import { PUERTO } from "./e2e/municipios";

/**
 * E2E contra la aplicacion construida, no contra `next dev`.
 *
 * `next dev` compila por ruta y a demanda: la primera visita a cada pagina
 * tarda segundos y los tests se vuelven intermitentes por razones que no
 * tienen nada que ver con lo que prueban. `build` + `start` corre lo mismo
 * que va a produccion.
 *
 * Necesita Postgres levantado (`pnpm db:local`). Lo que verifica —que la
 * cookie de un municipio no sirva en otro— no se puede simular sin base:
 * la garantia la da RLS mas el alcance de la cookie, y ninguno de los dos
 * existe en un doble de prueba.
 */

const ENTORNO = {
  DOMINIO_BASE: "localhost",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://xula_app:postgres@localhost:55432/xula_test",
  MIGRATION_DATABASE_URL:
    process.env.MIGRATION_DATABASE_URL ??
    "postgresql://xula_migrator:postgres@localhost:55432/xula_test",
  SUPER_ADMIN_DATABASE_URL:
    process.env.SUPER_ADMIN_DATABASE_URL ??
    "postgresql://xula_super_admin:postgres@localhost:55432/xula_test",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "secreto-de-prueba-no-usar-en-produccion",
  PIMIENTA_INTENTOS:
    process.env.PIMIENTA_INTENTOS ?? "pimienta-de-prueba-no-usar-en-produccion",
};

Object.assign(process.env, ENTORNO);

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/preparar.ts",
  /**
   * En serie y con un solo worker. Los dos municipios comparten base, y la
   * ventana de limitacion de ritmo es estado global por correo: dos tests
   * accediendo en paralelo se gastan la ventana entre ellos y el fallo
   * aparece en el que llegue segundo, no en el que tenga el error.
   */
  workers: 1,
  fullyParallel: false,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "on-first-retry",
    // Sin `baseURL`: cada test dice a que municipio va, y esconderlo detras
    // de una URL por defecto seria justo lo que este E2E prueba que importa.
  },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: {
    command: `pnpm build && PORT=${PUERTO} pnpm start`,
    /**
     * Un endpoint que no toca la base ni resuelve tenant.
     *
     * Playwright arranca el servidor **antes** del `globalSetup`, asi que
     * cuando corre este chequeo todavia no hay municipios sembrados.
     * Apuntarlo a `/acceso` de uno lo hacia esperar por datos que la
     * siembra iba a crear despues, y el servidor moria por timeout.
     */
    url: `http://localhost:${PUERTO}/api/salud`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: ENTORNO,
  },
});
