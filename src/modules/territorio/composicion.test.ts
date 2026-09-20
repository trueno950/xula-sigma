import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { porcionesDeTerritorio } from "./composicion";

/**
 * `tx` fabricado a mano, mismo patron que `padron/composicion.test.ts`:
 * alcanza con la parte de la cadena de Drizzle que `leer` realmente usa, y
 * corre sin Postgres.
 *
 * Prueba design.md decision 9; el porque de cada aserto -columnas
 * explicitas, `personaId` crudo- esta en el comentario de
 * `porcionesDeTerritorio` en `composicion.ts`, no aca.
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

  it("domicilios exporta bajaEn, igual que lugares y calles", async () => {
    const porcionDeDomicilios = porcionesDeTerritorio.find(
      (porcion) => porcion.nombre === "domicilios",
    );
    const { tx, select } = txDePrueba();

    await porcionDeDomicilios?.leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ bajaEn: expect.anything() }),
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
