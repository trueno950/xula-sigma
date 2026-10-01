import { expect, test } from "@playwright/test";
import postgres from "postgres";
import {
  CLAVE,
  CORREO,
  DOMINIO_BASE,
  MUNICIPIOS,
  PUERTO,
  urlDe,
} from "./municipios";

/**
 * El respaldo por host: que sostenga el redirect de un Server Action, y
 * que no lo pueda mover quien hace la peticion.
 *
 * Cuando corre y por que la condicion es la que es vive en `resolverHost`
 * (`src/proxy.ts`), que es su unico hogar.
 *
 * Los dos tests de aca necesitan sesion. Que un host ajeno no mueva el
 * municipio en las superficies **sin** sesion esta en
 * `hostAjeno.spec.ts`, que es donde vive el caso que cerro el agujero.
 *
 * Ninguno de los dos se puede escribir sin navegador: hace falta el
 * protocolo real de Server Actions y que el proxy corra de verdad sobre el
 * request.
 */

/**
 * La ventana de ritmo es de 5 intentos por correo cada 15 minutos
 * (`shared/auth/ritmo.ts`) y es estado global: `acceso.spec.ts` accede
 * cuatro veces con este mismo correo antes que este archivo. Sin vaciarla,
 * el primer acceso de aca entra al sexto intento y el test falla por la
 * ventana, no por lo que prueba.
 *
 * `TRUNCATE` con el rol owner porque `intentos_acceso` tiene FORCE RLS: un
 * `DELETE` no veria ninguna fila.
 */
test.beforeAll(async () => {
  const url = process.env.MIGRATION_DATABASE_URL;

  if (!url) throw new Error("Falta MIGRATION_DATABASE_URL para el E2E.");

  const owner = postgres(url, { max: 1 });

  try {
    await owner`TRUNCATE intentos_acceso`;
  } finally {
    await owner.end();
  }
});

/**
 * Accede reintentando mientras la respuesta sea "demasiados intentos".
 *
 * Vaciar `intentos_acceso` no alcanza: `pnpm start` corre en produccion y
 * ahi Better Auth suma **su propio** limitador, en memoria del proceso y
 * fuera de nuestra base. `acceso.spec.ts` accede cuatro veces con este
 * mismo correo justo antes, asi que el primer intento de aca cae dentro de
 * esa ventana.
 *
 * Se reintenta en vez de esperar un numero fijo porque ese numero seria
 * una afirmacion sobre la libreria que nadie verifica.
 *
 * El reintento **comprueba la sesion antes de volver al formulario**: el
 * acceso es del lado del cliente, asi que la navegacion tarda un momento
 * en llegar. Comparando la URL en el acto se leia la vieja, se reintentaba
 * con sesion ya abierta, y `/acceso` -que redirige a quien ya entro- no
 * tenia campo que llenar.
 */
async function accederConPaciencia(page: import("@playwright/test").Page) {
  for (let intento = 0; intento < 5; intento++) {
    await page.goto(urlDe("motul", "/acceso"));

    // Ya hay sesion: `/acceso` rebota al panel y no hay formulario.
    if (page.url() === urlDe("motul")) return;

    await page.getByLabel("Correo").fill(CORREO);
    await page.getByLabel("Contraseña").fill(CLAVE);
    await page.getByRole("button", { name: "Entrar" }).click();

    try {
      await page.waitForURL(urlDe("motul"), { timeout: 5_000 });
      return;
    } catch {
      await page.waitForTimeout(5_000);
    }
  }

  throw new Error("No se pudo acceder: la ventana de ritmo no se libero.");
}

/**
 * La reja es de Next, no nuestra, y por eso se prueba: compara
 * `x-forwarded-host` contra `Origin` en toda peticion de Server Action y
 * aborta si no coinciden ("Invalid Server Actions request", verificado en
 * Next 16.3.1). Sin esta validacion, un `x-forwarded-host` ajeno viajaria
 * hasta el render sintetico del destino y ahi si elegiria municipio.
 *
 * El dia que Next la saque, este test se pone en rojo y avisa. Esa es toda
 * su razon de existir.
 */
test("un x-forwarded-host ajeno aborta la Server Action", async ({ page }) => {
  await accederConPaciencia(page);
  await page.goto(urlDe("motul", "/padron/alta"));

  await page.route("**/padron/alta", async (route, request) => {
    if (request.method() !== "POST") return route.continue();

    await route.continue({
      headers: {
        ...request.headers(),
        "x-forwarded-host": `${MUNICIPIOS.ticul.subdominio}.${DOMINIO_BASE}:${PUERTO}`,
      },
    });
  });

  await page.getByLabel("Nombres").fill("Inyeccion");
  await page.getByLabel("Primer apellido").fill("Falseada");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForLoadState("networkidle");

  // El alta exitosa vuelve al listado. Que siga aca es que no se ejecuto.
  await expect(page).toHaveURL(urlDe("motul", "/padron/alta"));

  // El corte fue antes del caso de uso, no despues de ejecutarlo.
  await page.goto(urlDe("motul", "/padron?q=Inyeccion"));
  await expect(page.getByText("Falseada, Inyeccion")).toHaveCount(0);
});
