import { eq } from "drizzle-orm";
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

const filaRequerida = <T>(fila: T | undefined, nombre: string): T => {
  if (!fila) throw new Error(`${nombre} no fue creada.`);
  return fila;
};

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
          lugarId: filaRequerida(lugarMotul, "El lugar de Motul").id,
        })
        .returning({ id: calles.id }),
    );
    const [enTicul] = await withTenant(ticul, (tx) =>
      tx
        .insert(calles)
        .values({
          ayuntamientoId: ticul,
          nombre: "Calle 25",
          lugarId: filaRequerida(lugarTicul, "El lugar de Ticul").id,
          latitud: 20.937,
          longitud: -89.6237,
        })
        .returning({ id: calles.id }),
    );
    if (!enTicul) throw new Error("La calle de Ticul no fue creada.");

    const filas = await withTenant(motul, (tx) => tx.select().from(calles));

    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.id)).toContain(enMotul?.id);
    expect(filas.map((fila) => fila.latitud)).toEqual([null]);
  });

  it("un UPDATE cruzado por id afecta cero filas aunque conozca el id", async () => {
    const [lugarMotul] = await lugarDe(motul, "Motul actualizacion");
    const [lugarTicul] = await lugarDe(ticul, "Ticul actualizacion");
    await withTenant(motul, (tx) =>
      tx.insert(calles).values({
        ayuntamientoId: motul,
        nombre: "Calle Motul",
        lugarId: filaRequerida(lugarMotul, "El lugar de Motul").id,
      }),
    );
    const [calleTicul] = await withTenant(ticul, (tx) =>
      tx
        .insert(calles)
        .values({
          ayuntamientoId: ticul,
          nombre: "Calle Ticul",
          lugarId: filaRequerida(lugarTicul, "El lugar de Ticul").id,
          latitud: 20.5,
          longitud: -89.5,
        })
        .returning({ id: calles.id }),
    );
    if (!calleTicul) throw new Error("La calle de Ticul no fue creada.");

    const afectadas = await withTenant(motul, (tx) =>
      tx
        .update(calles)
        .set({ latitud: 21, longitud: -89 })
        .where(eq(calles.id, calleTicul.id))
        .returning({ id: calles.id }),
    );

    expect(afectadas).toEqual([]);
  });

  it("un lugarId de otro municipio insertado desde este es rechazado por Postgres", async () => {
    const [lugarTicul] = await lugarDe(ticul, "Yotholin");

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(calles).values({
          ayuntamientoId: motul,
          nombre: "Calle con lugar ajeno",
          lugarId: filaRequerida(lugarTicul, "El lugar de Ticul").id,
        }),
      ),
    );

    expect(motivo).toMatch(/calles_lugar_tenant_fk/i);
  });
});
