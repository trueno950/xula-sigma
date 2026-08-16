import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bitacora } from "./esquema";
import { cerrarConexion, withTenant } from "./withTenant";

/**
 * El invariante raiz: los datos de un municipio no se ven desde otro.
 *
 * Estos tests no se pueden simular con mocks. La garantia la da RLS, y RLS
 * solo existe dentro de Postgres. Un mock probaria que nuestro codigo llama
 * a las funciones que creemos que hay que llamar, que es exactamente la
 * pregunta equivocada.
 *
 * Corren con `DB_POOL_MAX=1` (ver vitest.config.ts). Con una sola conexion
 * en el pool, dos llamadas consecutivas a `withTenant` usan la misma
 * conexion fisica — que es la condicion sin la cual el escenario T2 no se
 * puede reproducir.
 */

const motul = randomUUID();
const ticul = randomUUID();

/**
 * Drizzle envuelve el error de Postgres en uno propio cuyo mensaje es
 * "Failed query: ..." y deja el motivo real en `cause`. Sin desenvolverlo,
 * un assert sobre el texto pasa o falla por razones que no tienen nada que
 * ver con lo que se quiere probar.
 */
async function motivoDeFalla(trabajo: () => Promise<unknown>): Promise<string> {
  try {
    await trabajo();
  } catch (error) {
    const e = error as { message: string; cause?: { message?: string } };
    return e.cause?.message ?? e.message;
  }
  throw new Error("Se esperaba que fallara, y no fallo.");
}

// Siembra con el rol owner: `xula_app` no tiene INSERT sobre
// `ayuntamientos` a proposito. Los municipios los da de alta el
// SUPER_ADMIN, no la aplicacion del municipio.
const urlOwner = process.env.MIGRATION_DATABASE_URL;
if (!urlOwner) throw new Error("Falta MIGRATION_DATABASE_URL para sembrar.");
const owner = postgres(urlOwner, { max: 1 });

/**
 * Conexion propia del test con el rol de aplicacion, sin pasar por
 * `withTenant`. Existe solo aca: sirve para comprobar que una consulta sin
 * tenant fijado no ve nada. En produccion no hay equivalente — `withTenant`
 * es la unica salida — y por eso esta conexion se abre en el test y no se
 * expone desde el modulo.
 */
const urlApp = process.env.DATABASE_URL;
if (!urlApp) throw new Error("Falta DATABASE_URL.");
const appSinTenant = postgres(urlApp, { max: 1, prepare: false });

beforeAll(async () => {
  await owner`
    INSERT INTO ayuntamientos (id, subdominio, nombre) VALUES
      (${motul}, ${`motul-${motul.slice(0, 8)}`}, 'Motul'),
      (${ticul}, ${`ticul-${ticul.slice(0, 8)}`}, 'Ticul')
  `;
  // La bitacora se siembra por `withTenant`, no con el rol owner. No es
  // una comodidad del test: `bitacora` tiene FORCE sin excepcion para el
  // dueno, asi que el owner tampoco puede insertar ahi. La escribe la
  // aplicacion o no la escribe nadie.
  for (const ayuntamiento of [motul, ticul]) {
    await withTenant(ayuntamiento, (tx) =>
      tx.insert(bitacora).values({
        ayuntamientoId: ayuntamiento,
        accion: "emitir",
        entidad: "constancia",
      }),
    );
  }
});

afterAll(async () => {
  // TRUNCATE y no DELETE. Con FORCE puesto, un `DELETE` del owner no
  // falla: RLS le esconde las filas y devuelve "DELETE 0", dejando la
  // tabla intacta y el test siguiente contaminado. TRUNCATE es operacion
  // de tabla, no de fila, y RLS no interviene.
  await owner`TRUNCATE bitacora, ayuntamientos CASCADE`;
  await owner.end();
  await appSinTenant.end();
  await cerrarConexion();
});

describe("aislamiento entre ayuntamientos", () => {
  it("T1 — una consulta sin filtro de tenant solo devuelve el tenant activo", async () => {
    // Sin `where`. A proposito: si el aislamiento dependiera de que el
    // programador se acuerde de filtrar, no seria aislamiento.
    const filas = await withTenant(motul, (tx) => tx.select().from(bitacora));

    expect(filas).toHaveLength(1);
    expect(filas[0]?.ayuntamientoId).toBe(motul);
  });

  it("T2 — un request de Motul y despues uno de Ticul no se contaminan", async () => {
    // El escenario textual del invariante: dos requests consecutivos de
    // municipios distintos reusando la conexion del pool.
    const deMotul = await withTenant(motul, async (tx) => {
      const activo = await tx.execute<{ tenant: string | null }>(
        sql`SELECT current_setting('app.tenant', true) AS tenant`,
      );
      expect(activo[0]?.tenant).toBe(motul);
      return tx.select().from(bitacora);
    });

    const deTicul = await withTenant(ticul, async (tx) => {
      // Si `withTenant` usara `SET` en vez de `SET LOCAL`, aca seguiria
      // puesto el valor de Motul y este assert lo delataria.
      const activo = await tx.execute<{ tenant: string | null }>(
        sql`SELECT current_setting('app.tenant', true) AS tenant`,
      );
      expect(activo[0]?.tenant).toBe(ticul);
      return tx.select().from(bitacora);
    });

    expect(deMotul.map((f) => f.ayuntamientoId)).toEqual([motul]);
    expect(deTicul.map((f) => f.ayuntamientoId)).toEqual([ticul]);
  });

  it("una consulta sin tenant fijado no ve ninguna fila", async () => {
    const filas = await appSinTenant`SELECT * FROM bitacora`;

    // El NULLIF deja `NULL`, la comparacion da NULL, y NULL no es TRUE. La
    // politica no deja pasar nada. Fallar cerrado, no abierto.
    expect(filas).toHaveLength(0);
  });

  it("no se puede insertar una fila a nombre de otro municipio", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(bitacora).values({
          ayuntamientoId: ticul,
          accion: "emitir",
          entidad: "constancia",
        }),
      ),
    );

    // Lo frena el WITH CHECK. Sin el, la fila entraria y despues no se
    // veria desde ningun municipio: una fuga que ni siquiera se nota.
    expect(motivo).toMatch(/row-level security/i);
  });

  it("la bitacora no se puede modificar ni borrar desde la aplicacion", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.execute(sql`DELETE FROM bitacora WHERE ayuntamiento_id = ${motul}`),
      ),
    );

    // Esto no lo frena una politica sino la ausencia del GRANT. Un permiso
    // que no existe no se puede olvidar de revisar.
    expect(motivo).toMatch(/permission denied/i);
  });

  it("rechaza un ayuntamiento_id que no sea UUID antes de tocar la base", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant("' OR true --", async () => "no deberia llegar aca"),
    );

    expect(motivo).toMatch(/UUID/);
  });
});
