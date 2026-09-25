import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { CLAVE, CORREO, MUNICIPIOS, urlDe } from "./municipios";

/**
 * Que dar de baja un lugar deje al operador en algun lado.
 *
 * Antes la accion revalidaba y nada mas, asi que la URL seguia diciendo
 * `?nodo=<el que se acaba de dar de baja>`. Ese nodo ya no resuelve y la
 * pantalla se renderizaba vacia: la operacion salia bien y parecia rota.
 *
 * Y de paso mide lo que el comentario viejo de `volverAlArbol` afirmaba
 * sin test: que un `redirect()` a la misma ruta con otra query "renderiza
 * un 404 mixto". Ese 404 era el del render sintetico perdiendo el tenant
 * -lo que cerro `resolverHost` en `proxy.ts`-, no el redirect. Si volviera,
 * este test se pone rojo aca y no en produccion.
 *
 * Necesita navegador: es el protocolo real de Server Actions, el proxy
 * corriendo sobre el request y el re-render que sigue al redirect.
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
 * Mismo reintento que `respaldoPorHost.spec.ts`, duplicado a proposito:
 * exportarlo ataria los dos archivos por el andamiaje. El porque del
 * reintento -el limitador propio de Better Auth, en memoria del proceso-
 * esta explicado alla.
 */
async function acceder(page: import("@playwright/test").Page) {
  for (let intento = 0; intento < 5; intento++) {
    await page.goto(urlDe("motul", "/acceso"));

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

const marca = Date.now();
const PADRE = `Baja padre ${marca}`;
const HIJO = `Baja hijo ${marca}`;

/**
 * El id del lugar recien creado.
 *
 * Se consulta la base en vez de navegar por la UI a proposito: lo que este
 * test mide es a donde deja la baja, y encadenar clics para llegar hasta
 * el hijo mete fallas de navegacion que no son las que se buscan.
 *
 * Se lee con el rol de aplicacion y `app.tenant` puesto, no con el owner.
 * `FORCE ROW LEVEL SECURITY` no exceptua al dueno de la tabla: la consulta
 * con el rol de migraciones devolvia cero filas siempre, y este test fallo
 * cuatro veces senialando al proxy antes de que se viera que el problema
 * era la lente con la que miraba.
 */
async function idDelLugar(nombre: string): Promise<string> {
  const url = process.env.DATABASE_URL;

  if (!url) throw new Error("Falta DATABASE_URL para el E2E.");

  const app = postgres(url, { max: 1 });

  try {
    // Se reintenta porque el alta no redirige: `networkidle` vuelve antes
    // de que la Server Action haya escrito, y no hay cambio de URL que
    // esperar. La fila es la unica senial confiable de que termino.
    for (let intento = 0; intento < 30; intento++) {
      const filas = await app.begin(async (tx) => {
        // Con el rol de aplicacion y `app.tenant`, no con el owner: estas
        // tablas tienen FORCE RLS y la politica no exceptua al dueno, asi
        // que `xula_migrator` lee cero filas y el test se pone rojo por la
        // lente, no por el codigo. Costo medirlo.
        await tx`SELECT set_config('app.tenant', ${MUNICIPIOS.motul.id}, true)`;

        return tx<{ id: string }[]>`
          SELECT id FROM lugares WHERE nombre = ${nombre} LIMIT 1
        `;
      });
      const fila = filas[0];

      if (fila) return fila.id;

      await new Promise((seguir) => setTimeout(seguir, 500));
    }

    throw new Error(`No se creo el lugar "${nombre}".`);
  } finally {
    await app.end();
  }
}

async function altaDeLugar(
  page: import("@playwright/test").Page,
  tipo: string,
  nombre: string,
) {
  await page.getByLabel("Tipo").selectOption(tipo);
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Dar de alta" }).click();
  await page.waitForLoadState("networkidle");
}

test("dar de baja un hijo deja al operador en el padre, no en blanco", async ({
  page,
}) => {
  await acceder(page);

  await page.goto(urlDe("motul", "/territorio?accion=lugar"));
  await altaDeLugar(page, "comisaria", PADRE);
  const padreId = await idDelLugar(PADRE);

  await page.goto(urlDe("motul", `/territorio?raiz=${padreId}&accion=lugar`));
  await altaDeLugar(page, "colonia", HIJO);
  const hijoId = await idDelLugar(HIJO);

  await page.goto(
    urlDe(
      "motul",
      `/territorio?raiz=${padreId}&nodo=${hijoId}&vista=editar&accion=baja`,
    ),
  );
  await expect(
    page.getByRole("heading", { name: HIJO, exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: `Dar de baja ${HIJO}` }).click();
  await page.waitForLoadState("networkidle");

  // Lo que fallaba: la URL seguia nombrando al hijo y no quedaba nada.
  expect(page.url()).not.toContain(hijoId);
  await expect(
    page.getByRole("heading", { name: PADRE, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: HIJO })).toHaveCount(0);
});
