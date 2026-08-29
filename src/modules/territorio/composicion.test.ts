import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { porcionesDeTerritorio } from "./composicion";

/**
 * `tx` fabricado a mano, mismo patron que `padron/composicion.test.ts`:
 * alcanza con la parte de la cadena de Drizzle que `leer` realmente usa, y
 * corre sin Postgres.
 *
 * Prueba design.md decision 9: cuatro porciones planas, columnas
 * explicitas -nunca `select()` pelado- y `residencias` exporta
 * `personaId` crudo (el conjunto `personas` ya va en el mismo archivo, y
 * esconderlo dejaria un historial que no se puede leer).
 */
const txDePrueba = () => {
  const from = vi.fn().mockResolvedValue([]);
  const select = vi.fn().mockReturnValue({ from });

  return { tx: { select } as unknown as TransaccionTenant, select };
};

describe("porcionesDeTerritorio", () => {
  it("declara las cuatro porciones con nombres distintos entre si y de los de la plataforma", () => {
    const nombres = porcionesDeTerritorio.map((porcion) => porcion.nombre);

    expect(nombres).toEqual(["lugares", "calles", "domicilios", "residencias"]);
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const conocido of ["usuarios", "bitacora", "personas"]) {
      expect(nombres).not.toContain(conocido);
    }
  });

  it("cada porcion lee columnas explicitas, nunca select() pelado", async () => {
    for (const porcion of porcionesDeTerritorio) {
      const { tx, select } = txDePrueba();

      await porcion.leer(tx);

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.anything() }),
      );
    }
  });

  it("residencias exporta personaId crudo: el historial tiene que poder leerse", async () => {
    const porcionDeResidencias = porcionesDeTerritorio.find(
      (porcion) => porcion.nombre === "residencias",
    );
    const { tx, select } = txDePrueba();

    await porcionDeResidencias?.leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ personaId: expect.anything() }),
    );
  });

  it("ninguna porcion incluye ayuntamientoId: es redundante para quien pide la exportacion", async () => {
    for (const porcion of porcionesDeTerritorio) {
      const { tx, select } = txDePrueba();

      await porcion.leer(tx);

      expect(select).not.toHaveBeenCalledWith(
        expect.objectContaining({ ayuntamientoId: expect.anything() }),
      );
    }
  });
});
