import { describe, expect, it } from "vitest";
import { originalDe, vincularDuplicado } from "./duplicado";
import { DuplicadoDeSiMismoError } from "./errores";

describe("originalDe", () => {
  it("sin vinculo devuelve el propio id", () => {
    expect(originalDe({ id: "x", duplicadoDeReporteId: null })).toBe("x");
  });

  it("con vinculo devuelve el vinculo, no el propio id", () => {
    expect(originalDe({ id: "b", duplicadoDeReporteId: "a" })).toBe("a");
  });
});

describe("vincularDuplicado", () => {
  it("rechaza marcar un reporte duplicado de si mismo (ciclo de largo 1)", () => {
    expect(() =>
      vincularDuplicado("x", { id: "x", duplicadoDeReporteId: null }),
    ).toThrow(DuplicadoDeSiMismoError);
  });

  it("duplicado de un duplicado guarda el original de la cadena", () => {
    // C duplicado de B, que ya es duplicado de A -> guarda A, no B.
    expect(vincularDuplicado("c", { id: "b", duplicadoDeReporteId: "a" })).toBe(
      "a",
    );
  });

  it("rechaza el ciclo de largo 2 que la aplicacion si puede detectar", () => {
    // A se marca duplicado de B, pero B ya es duplicado de A: cierra
    // contra el reporte que se esta rechazando.
    expect(() =>
      vincularDuplicado("a", { id: "b", duplicadoDeReporteId: "a" }),
    ).toThrow(DuplicadoDeSiMismoError);
  });
});
