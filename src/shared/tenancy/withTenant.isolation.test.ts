import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AyuntamientoId } from "./ayuntamientoId";
import { bitacora } from "./esquema";
import {
  appSinTenant,
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
  ticul,
} from "./municipiosDePrueba";
import { cerrarConexion, withTenant } from "./withTenant";

/**
 * El invariante raiz: los datos de un municipio no se ven desde otro.
 *
 * Estos tests no se pueden simular con mocks. La garantia la da RLS, y RLS
 * solo existe dentro de Postgres. Un mock probaria que nuestro codigo llama
 * a las funciones que creemos que hay que llamar, que es la pregunta
 * equivocada.
 *
 * Corren con `DB_POOL_MAX=1` (ver vitest.config.ts). Con una sola conexion
 * en el pool, dos llamadas consecutivas a `withTenant` usan la misma
 * conexion fisica — condicion sin la cual el escenario T2 no se reproduce.
 */

beforeAll(sembrar);

afterAll(async () => {
  await limpiar();
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

  it("rechaza un ayuntamiento_id que no sea UUID aunque se evada el tipo", async () => {
    // El cast simula a alguien escribiendo `as AyuntamientoId` para
    // saltarse la marca. La defensa en tiempo de ejecucion tiene que
    // seguir ahi: no puede depender de que nadie escriba un `as`.
    const motivo = await motivoDeFalla(() =>
      withTenant("' OR true --" as AyuntamientoId, async () => "no llega"),
    );

    expect(motivo).toMatch(/UUID/);
  });
});
