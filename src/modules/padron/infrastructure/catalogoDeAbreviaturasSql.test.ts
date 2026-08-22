import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { catalogoDeAbreviaturasSql } from "./catalogoDeAbreviaturasSql";

/**
 * `tx` fabricado a mano: alcanza con la parte de la cadena de Drizzle que
 * `catalogoDeAbreviaturasSql` realmente usa (`select().from(...)`), y deja
 * que este test corra sin Postgres.
 */
const txQueDevuelve = (filas: readonly { corta: string; larga: string }[]) => {
  const from = vi.fn().mockResolvedValue(filas);
  const select = vi.fn().mockReturnValue({ from });

  return { tx: { select } as unknown as TransaccionTenant, from };
};

describe("catalogoDeAbreviaturasSql", () => {
  it("lee abreviaturas y memoiza el resultado para lecturas posteriores", async () => {
    const { tx: primeraTx } = txQueDevuelve([
      { corta: "ma", larga: "maria" },
      { corta: "gpe", larga: "guadalupe" },
    ]);
    // Datos distintos a proposito: si la segunda lectura los devolviera,
    // significaria que no memoizo.
    const { tx: segundaTx, from: segundaFrom } = txQueDevuelve([
      { corta: "z", larga: "otra-cosa" },
    ]);

    const primera = await catalogoDeAbreviaturasSql.leer(primeraTx);
    const segunda = await catalogoDeAbreviaturasSql.leer(segundaTx);

    expect(primera.get("ma")).toBe("maria");
    expect(primera.get("gpe")).toBe("guadalupe");
    expect(segunda).toBe(primera);
    expect(segundaFrom).not.toHaveBeenCalled();
  });
});
