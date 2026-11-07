import { describe, expect, it } from "vitest";
import { MAXIMO_DE_PALABRAS, palabrasDeBusqueda } from "./busquedaPorPalabras";

describe("palabrasDeBusqueda", () => {
  it("parte la consulta por espacios", () => {
    expect(palabrasDeBusqueda("  Calle 22   265 ")).toEqual([
      "Calle",
      "22",
      "265",
    ]);
  });

  it("quita el # y la coma pegados a la palabra", () => {
    expect(palabrasDeBusqueda("Calle 22, #265-A")).toEqual([
      "Calle",
      "22",
      "265-A",
    ]);
  });

  it("descarta las palabras que son solo signos", () => {
    expect(palabrasDeBusqueda("calle - 22 # . 265")).toEqual([
      "calle",
      "22",
      "265",
    ]);
  });

  it("conserva los comodines de LIKE, aun solos: los escapa la consulta", () => {
    expect(palabrasDeBusqueda("9% 20_a %_ literal")).toEqual([
      "9%",
      "20_a",
      "%_",
      "literal",
    ]);
  });

  it("una consulta de solo signos no deja palabras", () => {
    expect(palabrasDeBusqueda("# , -")).toEqual([]);
  });

  it(`se queda con las primeras ${MAXIMO_DE_PALABRAS} palabras`, () => {
    expect(palabrasDeBusqueda("a b c d e f g h")).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
    ]);
    expect(MAXIMO_DE_PALABRAS).toBe(6);
  });
});
