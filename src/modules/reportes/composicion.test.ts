import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { porcionesDeReportes } from "./composicion";

/**
 * `tx` fabricado a mano, mismo patron que `territorio/composicion.test.ts`
 * y `constancias/composicion.test.ts`: alcanza con la parte de la cadena de
 * Drizzle que `leer` realmente usa, y corre sin Postgres.
 */
const txDePrueba = () => {
  const from = vi.fn().mockResolvedValue([]);
  const select = vi.fn().mockReturnValue({ from });

  return { tx: { select } as unknown as TransaccionTenant, select };
};

describe("porcionesDeReportes", () => {
  it("declara las dos porciones con nombres distintos entre si y de los de la plataforma, padron, territorio y constancias", () => {
    const nombres = porcionesDeReportes.map((porcion) => porcion.nombre);

    expect(nombres).toEqual(["reportes", "movimientos_de_reportes"]);
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const conocido of [
      "usuarios",
      "bitacora",
      "personas",
      "lugares",
      "calles",
      "domicilios",
      "residencias",
      "constancias",
    ]) {
      expect(nombres).not.toContain(conocido);
    }
  });

  it("cada porcion lee columnas explicitas, nunca select() pelado", async () => {
    for (const porcion of porcionesDeReportes) {
      const { tx, select } = txDePrueba();

      await porcion.leer(tx);

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.anything() }),
      );
    }
  });

  it("reportes incluye descripcion y referencia: el archivo municipal reconstruye que se reporto", async () => {
    const porcionDeReportes = porcionesDeReportes.find(
      (porcion) => porcion.nombre === "reportes",
    );
    const { tx, select } = txDePrueba();

    await porcionDeReportes?.leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        descripcion: expect.anything(),
        referencia: expect.anything(),
      }),
    );
  });

  it("ninguna porcion incluye ayuntamientoId: es redundante para quien pide la exportacion", async () => {
    for (const porcion of porcionesDeReportes) {
      const { tx, select } = txDePrueba();

      await porcion.leer(tx);

      expect(select).not.toHaveBeenCalledWith(
        expect.objectContaining({ ayuntamientoId: expect.anything() }),
      );
    }
  });
});
