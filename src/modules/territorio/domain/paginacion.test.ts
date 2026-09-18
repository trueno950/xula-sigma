import { describe, expect, it } from "vitest";
import { resolverPagina } from "./paginacion";

describe("resolverPagina", () => {
  it("con exactamente el limite conserva las filas y no ofrece mas", () => {
    expect(resolverPagina(["uno", "dos"], 2)).toEqual({
      filas: ["uno", "dos"],
      hayMas: false,
    });
  });

  it("con una fila adicional recorta al limite y ofrece mas", () => {
    expect(resolverPagina(["uno", "dos", "tres"], 2)).toEqual({
      filas: ["uno", "dos"],
      hayMas: true,
    });
  });

  it("con cero filas no ofrece mas", () => {
    expect(resolverPagina([], 2)).toEqual({ filas: [], hayMas: false });
  });

  it.each([-1, 0, 1.5, Number.NaN])(
    "rechaza un limite que no es entero positivo: %s",
    (limite) => {
      expect(() => resolverPagina(["a", "b", "c"], limite)).toThrow(
        /limite invalido/,
      );
    },
  );
});
