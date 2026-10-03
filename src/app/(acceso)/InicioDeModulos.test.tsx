import { describe, expect, it } from "vitest";
import { anchoDelPrimero } from "./InicioDeModulos";

/** Una fila completa significa que los modulos mas el extra caben justos. */
const llena = (modulos: number, columnas: number) =>
  (modulos - 1 + anchoDelPrimero(modulos, columnas)) % columnas === 0;

describe("anchoDelPrimero", () => {
  it.each([1, 2, 3, 4, 5, 6, 7])(
    "%i modulos llenan sus filas en 2 y en 3 columnas",
    (modulos) => {
      expect(llena(modulos, 2)).toBe(true);
      expect(llena(modulos, 3)).toBe(true);
    },
  );

  it("no ensancha al primero cuando las filas ya cierran", () => {
    expect(anchoDelPrimero(3, 3)).toBe(1);
    expect(anchoDelPrimero(4, 2)).toBe(1);
  });

  it("nunca pasa del numero de columnas", () => {
    expect(anchoDelPrimero(1, 3)).toBe(3);
    expect(anchoDelPrimero(4, 3)).toBe(3);
  });
});
