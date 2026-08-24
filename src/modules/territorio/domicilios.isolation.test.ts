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

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const asentamientoDe = async (ayuntamientoId: typeof motul, nombre: string) => {
  const [lugar] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(lugares)
      .values({ ayuntamientoId, tipo: "comisaria", nombre })
      .returning({ id: lugares.id }),
  );
  const [calle] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .insert(calles)
      .values({ ayuntamientoId, nombre: `Calle ${nombre}`, lugarId: lugar!.id })
      .returning({ id: calles.id }),
  );
  return { lugarId: lugar!.id, calleId: calle!.id };
};

describe("aislamiento de domicilios", () => {
  it("una consulta sin filtro solo devuelve los domicilios del tenant activo", async () => {
    const enMotulAsentamiento = await asentamientoDe(motul, "Motul");
    const enTiculAsentamiento = await asentamientoDe(ticul, "Ticul");

    const [enMotul] = await withTenant(motul, (tx) =>
      tx
        .insert(domicilios)
        .values({
          ayuntamientoId: motul,
          lugarId: enMotulAsentamiento.lugarId,
          calleId: enMotulAsentamiento.calleId,
        })
        .returning({ id: domicilios.id }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(domicilios).values({
        ayuntamientoId: ticul,
        lugarId: enTiculAsentamiento.lugarId,
        calleId: enTiculAsentamiento.calleId,
      }),
    );

    const filas = await withTenant(motul, (tx) => tx.select().from(domicilios));

    expect(filas.every((fila) => fila.ayuntamientoId === motul)).toBe(true);
    expect(filas.map((fila) => fila.id)).toContain(enMotul?.id);
  });

  it("un calleId de otro municipio insertado desde este es rechazado por Postgres", async () => {
    const enMotulAsentamiento = await asentamientoDe(motul, "MotulDos");
    const enTiculAsentamiento = await asentamientoDe(ticul, "TiculDos");

    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(domicilios).values({
          ayuntamientoId: motul,
          lugarId: enMotulAsentamiento.lugarId,
          calleId: enTiculAsentamiento.calleId,
        }),
      ),
    );

    expect(motivo).toMatch(/domicilios_calle_tenant_fk/i);
  });
});
