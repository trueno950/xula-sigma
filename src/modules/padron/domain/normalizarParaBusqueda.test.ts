import { describe, expect, it } from "vitest";
import { normalizarParaBusqueda } from "./normalizarParaBusqueda";

describe("normalizarParaBusqueda", () => {
  it("pasa a minusculas", () => {
    expect(normalizarParaBusqueda("MARIA GUADALUPE", new Map())).toBe(
      "maria guadalupe",
    );
  });

  it("quita acentos", () => {
    expect(normalizarParaBusqueda("María José Muñoz", new Map())).toBe(
      "maria jose munoz",
    );
  });

  it("quita puntos", () => {
    expect(normalizarParaBusqueda("Ma. Gpe.", new Map())).toBe("ma gpe");
  });

  it("expande abreviaturas token por token con el diccionario recibido", () => {
    const diccionario = new Map([
      ["ma", "maria"],
      ["gpe", "guadalupe"],
    ]);

    expect(normalizarParaBusqueda("Ma. Gpe. Kumul", diccionario)).toBe(
      "maria guadalupe kumul",
    );
  });

  it("colapsa espacios repetidos y recorta los extremos", () => {
    expect(normalizarParaBusqueda("  Jose   Kumul  ", new Map())).toBe(
      "jose kumul",
    );
  });

  it("un token fuera del diccionario queda igual", () => {
    expect(normalizarParaBusqueda("Kumul", new Map([["ma", "maria"]]))).toBe(
      "kumul",
    );
  });
});
