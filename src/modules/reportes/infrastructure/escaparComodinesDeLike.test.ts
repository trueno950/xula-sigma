import { describe, expect, it } from "vitest";
import { escaparComodinesDeLike } from "./escaparComodinesDeLike";

describe("escaparComodinesDeLike", () => {
  it("escapa % para que no actue como comodin", () => {
    expect(escaparComodinesDeLike("avance 50%")).toBe("avance 50\\%");
  });

  it("escapa _ para que no actue como comodin de un caracter", () => {
    expect(escaparComodinesDeLike("calle_20")).toBe("calle\\_20");
  });

  it("escapa la barra invertida antes que los comodines, sin doble escape", () => {
    expect(escaparComodinesDeLike("a\\b")).toBe("a\\\\b");
  });

  it("texto sin comodines queda igual", () => {
    expect(escaparComodinesDeLike("bache en la calle 12")).toBe(
      "bache en la calle 12",
    );
  });
});
