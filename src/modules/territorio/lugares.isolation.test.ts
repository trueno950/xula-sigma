import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { calles, domicilios, lugares } from "./infrastructure/esquema";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";

/**
 * Forma canonica del test de aislamiento (`invariantes-criticos.md`, Capa
 * 2): inserta directo con `withTenant`, sin pasar por caso de uso.
 */

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento de lugares", () => {
  it("una consulta sin filtro solo devuelve los lugares del tenant activo", async () => {
    const [enMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(lugares)
        .values({
          ayuntamientoId: motul,
          tipo: "comisaria",
          nombre: "Dzununcan",
        })
        .returning({ id: lugares.id }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(lugares).values({
        ayuntamientoId: ticul,
        tipo: "comisaria",
        nombre: "Pustunich",
      }),
    );

    const filas = await withTenant(motul, (tx) => tx.select().from(lugares));

    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.id)).toContain(enMotul?.id);
  });

  it("un padreId de otro municipio insertado desde este es rechazado por Postgres", async () => {
    const [enTicul] = await withTenant(ticul, (tx) =>
      tx
        .insert(lugares)
        .values({
          ayuntamientoId: ticul,
          tipo: "comisaria",
          nombre: "Yotholin",
        })
        .returning({ id: lugares.id }),
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(lugares).values({
          ayuntamientoId: motul,
          tipo: "colonia",
          nombre: "Colonia con padre ajeno",
          padreId: enTicul?.id,
        }),
      ),
    );

    expect(motivo).toMatch(/lugares_padre_tenant_fk/i);
  });

  it("una segunda cabecera en el mismo municipio es rechazada", async () => {
    await withTenant(motul, (tx) =>
      tx
        .insert(lugares)
        .values({ ayuntamientoId: motul, tipo: "cabecera", nombre: "Motul" }),
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(lugares).values({
          ayuntamientoId: motul,
          tipo: "cabecera",
          nombre: "Motul otra vez",
        }),
      ),
    );

    expect(motivo).toMatch(/lugares_una_cabecera/i);
  });

  it("un lugar como padre de si mismo es rechazado", async () => {
    const [propio] = await withTenant(motul, (tx) =>
      tx
        .insert(lugares)
        .values({ ayuntamientoId: motul, tipo: "colonia", nombre: "Autopadre" })
        .returning({ id: lugares.id }),
    );

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.execute(
          sql`UPDATE lugares SET padre_id = id WHERE id = ${propio?.id}`,
        ),
      ),
    );

    expect(motivo).toMatch(/lugares_sin_autopadre/i);
  });

  it("subarbol no filtra por tenant en su SQL crudo: RLS lo hace, y aca se prueba", async () => {
    const [sectorMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(lugares)
        .values({ ayuntamientoId: motul, tipo: "sector", nombre: "Sector M" })
        .returning({ id: lugares.id }),
    );
    const [calleMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(calles)
        .values({
          ayuntamientoId: motul,
          nombre: "Calle M",
          lugarId: sectorMotul!.id,
        })
        .returning({ id: calles.id }),
    );
    await withTenant(motul, (tx) =>
      tx.insert(domicilios).values({
        ayuntamientoId: motul,
        lugarId: sectorMotul!.id,
        calleId: calleMotul!.id,
      }),
    );

    /**
     * Mismo id de raiz, tenant distinto: si `subarbol` dependiera de un
     * `WHERE ayuntamiento_id` propio en vez de RLS, esto devolveria el
     * domicilio de `motul`. Con `app.tenant = ticul` fijado por
     * `withTenant`, la semilla del CTE (`WHERE id = raizId`) no encuentra
     * la fila -RLS la esconde- y la recursion nunca arranca.
     */
    const nodosDesdeTicul = await withTenant(ticul, (tx) =>
      repositorioDeLugaresSql.subarbol(tx, sectorMotul!.id),
    );

    expect(nodosDesdeTicul).toHaveLength(0);
  });
});
