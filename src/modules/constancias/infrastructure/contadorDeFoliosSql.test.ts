import { describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { contadorDeFoliosSql } from "./contadorDeFoliosSql";

const MOTUL = "11111111-1111-1111-1111-111111111111" as AyuntamientoId;

/**
 * `tx` fabricado a mano, mismo patron que `repositorioDeDocumentosSql.test.ts`:
 * alcanza con la parte de la cadena de Drizzle que
 * `contadorDeFoliosSql.siguiente` realmente usa. La prueba real del lock
 * -que es lo que importa aca- es `folio.integration.test.ts` contra
 * Postgres (design.md de `constancias-oficios`, seccion 4).
 */
const txDeContador = (consecutivo: number) => {
  const returning = vi.fn().mockResolvedValue([{ consecutivo }]);
  const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  const insert = vi.fn().mockReturnValue({ values });

  return {
    tx: { insert } as unknown as TransaccionTenant,
    insert,
    values,
    onConflictDoUpdate,
    returning,
  };
};

describe("contadorDeFoliosSql", () => {
  it("primera llamada de una serie nueva devuelve 1", async () => {
    const { tx, values } = txDeContador(1);

    const consecutivo = await contadorDeFoliosSql.siguiente(tx, {
      ayuntamientoId: MOTUL,
      tipo: "VECINDAD",
      anio: 2026,
    });

    expect(consecutivo).toBe(1);
    expect(values).toHaveBeenCalledWith({
      ayuntamientoId: MOTUL,
      tipo: "VECINDAD",
      anio: 2026,
      ultimoConsecutivo: 1,
    });
  });

  it("segunda llamada de la misma serie devuelve 2, via ON CONFLICT DO UPDATE sobre la tripleta", async () => {
    const { tx, onConflictDoUpdate } = txDeContador(2);

    const consecutivo = await contadorDeFoliosSql.siguiente(tx, {
      ayuntamientoId: MOTUL,
      tipo: "VECINDAD",
      anio: 2026,
    });

    expect(consecutivo).toBe(2);
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
    const argumento = onConflictDoUpdate.mock.calls[0]?.[0];
    // El SET incrementa la fila existente, no reescribe un valor fijo -si no,
    // dos llamadas seguidas devolverian 1 y 1, no 1 y 2 (design.md seccion 4).
    expect(argumento.set.ultimoConsecutivo).not.toBe(1);
  });
});
