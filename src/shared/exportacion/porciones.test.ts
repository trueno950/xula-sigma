import { describe, expect, it } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { agregarPorciones, type PorcionExportable } from "./agregarPorciones";

/**
 * El agujero que design.md documenta (decision 6, "un agujero que se
 * encontro de paso"): `conjuntosDe` armaba el archivo entregado con un
 * `Record` sin guarda, asi que dos porciones que reclamaran el mismo
 * `nombre` se pisaban en silencio y el archivo entregado perdia un
 * conjunto sin que nada avisara.
 *
 * `tx` nunca se usa de verdad aca: las porciones de prueba lo ignoran, asi
 * que corre sin Postgres.
 */
const txDePrueba = {} as TransaccionTenant;

const porcionDe = (
  nombre: string,
  filas: readonly unknown[],
): PorcionExportable => ({
  nombre,
  leer: async () => filas,
});

describe("agregarPorciones", () => {
  it("agrega cada conjunto bajo el nombre de su porcion", async () => {
    const conjuntos = await agregarPorciones(txDePrueba, {}, [
      porcionDe("personas", [{ id: 1 }]),
    ]);

    expect(conjuntos.personas).toEqual([{ id: 1 }]);
  });

  it("dos porciones con el mismo nombre fallan explicito, no se pisan en silencio", async () => {
    const porciones = [
      porcionDe("personas", [{ id: 1 }]),
      porcionDe("personas", [{ id: 2 }]),
    ];

    await expect(agregarPorciones(txDePrueba, {}, porciones)).rejects.toThrow();
  });

  it("una porcion no puede reclamar un nombre que ya usa la plataforma", async () => {
    const base = { usuarios: [] };

    await expect(
      agregarPorciones(txDePrueba, base, [porcionDe("usuarios", [{ id: 1 }])]),
    ).rejects.toThrow();
  });
});
