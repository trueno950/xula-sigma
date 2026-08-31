import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { comoCalleId, comoLugarId } from "../domain";
import { lectorDeUbicacionesSql } from "./lectorDeUbicacionesSql";

/**
 * `tx` fabricado a mano, mismo patron que `lectorDeDireccionesSql.test.ts`:
 * alcanza con mockear `tx.execute` para el `WITH RECURSIVE` y un builder de
 * Drizzle encadenable para la consulta de `calles` -las dos partes con
 * decision del adaptador, sin Postgres.
 */
const txDeLectura = (
  filasDeLugares: readonly Record<string, unknown>[],
  filasDeCalle: readonly Record<string, unknown>[] = [],
) => {
  const execute = vi.fn().mockResolvedValue(filasDeLugares);
  const where = vi.fn().mockResolvedValue(filasDeCalle);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return {
    tx: { execute, select } as unknown as TransaccionTenant,
    execute,
    select,
    from,
    where,
  };
};

const lugarId = comoLugarId("11111111-1111-4111-8111-111111111111");
const calleId = comoCalleId("22222222-2222-4222-8222-222222222222");

describe("lectorDeUbicacionesSql", () => {
  it("resuelve la cadena de ancestros hacia arriba desde lugarId, sin calle -calleId null-", async () => {
    const { tx, select } = txDeLectura([
      { nombreAncestro: "Colonia Centro" },
      { nombreAncestro: "Motul" },
    ]);

    const partes = await lectorDeUbicacionesSql.partesDe(tx, lugarId, null);

    expect(partes).toEqual({
      calle: null,
      ancestros: ["Colonia Centro", "Motul"],
    });
    expect(select).not.toHaveBeenCalled();
  });

  it("lugarId sin filas -inexistente, de baja, o de otro tenant- devuelve null sin consultar calles", async () => {
    const { tx, select } = txDeLectura([]);

    const partes = await lectorDeUbicacionesSql.partesDe(tx, lugarId, calleId);

    expect(partes).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });

  it("con calleId presente y valida, la segunda consulta con el builder de Drizzle resuelve su nombre", async () => {
    const { tx, select } = txDeLectura(
      [{ nombreAncestro: "Colonia Centro" }],
      [{ nombre: "Calle 20" }],
    );

    const partes = await lectorDeUbicacionesSql.partesDe(tx, lugarId, calleId);

    expect(partes).toEqual({
      calle: "Calle 20",
      ancestros: ["Colonia Centro"],
    });
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("calleId que no existe -otro tenant o borrada- devuelve null entero, distinto del caso 'no se pidio calle'", async () => {
    const { tx, select } = txDeLectura(
      [{ nombreAncestro: "Colonia Centro" }],
      [],
    );

    const partes = await lectorDeUbicacionesSql.partesDe(tx, lugarId, calleId);

    expect(partes).toBeNull();
    expect(select).toHaveBeenCalledTimes(1);
  });
});
