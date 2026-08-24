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
import { lugares } from "./infrastructure/esquema";

/**
 * Forma canonica del test de aislamiento (`invariantes-criticos.md`, Capa
 * 2): inserta directo con `withTenant`, sin caso de uso -todavia no
 * existe ninguno (tasks.md Fase 3)-.
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
});
