import { describe, expect, it } from "vitest";
import { indicePrevio, siguienteIndice } from "./navegacionDeSugerencias";

describe("siguienteIndice", () => {
  it("avanza uno", () => {
    expect(siguienteIndice(0, 3)).toBe(1);
  });

  it("del ultimo vuelve al primero", () => {
    expect(siguienteIndice(2, 3)).toBe(0);
  });

  it("desde -1 (nada marcado) va al primero", () => {
    expect(siguienteIndice(-1, 3)).toBe(0);
  });
});

describe("indicePrevio", () => {
  it("retrocede uno", () => {
    expect(indicePrevio(2, 3)).toBe(1);
  });

  it("del primero va al ultimo", () => {
    expect(indicePrevio(0, 3)).toBe(2);
  });

  it("desde -1 (nada marcado) va al ultimo", () => {
    expect(indicePrevio(-1, 3)).toBe(2);
  });
});
