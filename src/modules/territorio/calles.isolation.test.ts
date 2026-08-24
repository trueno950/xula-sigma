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
import { calles, lugares } from "./infrastructure/esquema";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const lugarDe = (ayuntamientoId: typeof motul, nombre: string) =>
  withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(lugares)
      .values({ ayuntamientoId, tipo: "comisaria", nombre })
      .returning({ id: lugares.id }),
  );

describe("aislamiento de calles", () => {
  it("una consulta sin filtro solo devuelve las calles del tenant activo", async () => {
    const [lugarMotul] = await lugarDe(motul, "Motul centro");
    const [lugarTicul] = await lugarDe(ticul, "Ticul centro");

    const [enMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(calles)
        .values({
          ayuntamientoId: motul,
          nombre: "Calle 20",
          lugarId: lugarMotul!.id,
        })
        .returning({ id: calles.id }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(calles).values({
        ayuntamientoId: ticul,
        nombre: "Calle 25",
        lugarId: lugarTicul!.id,
      }),
    );

    const filas = await withTenant(motul, (tx) => tx.select().from(calles));

    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.id)).toContain(enMotul?.id);
  });

  it("un lugarId de otro municipio insertado desde este es rechazado por Postgres", async () => {
    const [lugarTicul] = await lugarDe(ticul, "Yotholin");

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(calles).values({
          ayuntamientoId: motul,
          nombre: "Calle con lugar ajeno",
          lugarId: lugarTicul!.id,
        }),
      ),
    );

    expect(motivo).toMatch(/calles_lugar_tenant_fk/i);
  });
});
