import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { porcionDePadron } from "./composicion";

/**
 * `tx` fabricado a mano, mismo patron que
 * `infrastructure/repositorioDePersonasSql.test.ts`: alcanza con la parte
 * de la cadena de Drizzle que `leer` realmente usa, y corre sin Postgres.
 *
 * Prueba design.md decision 6: el archivo entregado a un municipio no
 * esconde tombstones de fusion. Un `select()` pelado deja pasar una
 * columna nueva y sensible sin que nadie la revise -mismo riesgo que
 * `exportar.ts` ya documenta para `usuarios`- y este test lo fija para
 * `personas` antes de que exista una segunda columna sensible.
 */
const txDePrueba = () => {
  const from = vi.fn().mockResolvedValue([]);
  const select = vi.fn().mockReturnValue({ from });

  return { tx: { select } as unknown as TransaccionTenant, select };
};

describe("porcionDePadron", () => {
  it("declara su nombre para el archivo entregado", () => {
    expect(porcionDePadron.nombre).toBe("personas");
  });

  it("lee columnas explicitas, nunca select() pelado", async () => {
    const { tx, select } = txDePrueba();

    await porcionDePadron.leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.anything() }),
    );
  });

  it("incluye fusionadaEn: el archivo municipal no esconde tombstones", async () => {
    const { tx, select } = txDePrueba();

    await porcionDePadron.leer(tx);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({ fusionadaEn: expect.anything() }),
    );
  });
});
