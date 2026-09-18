import { describe, expect, it } from "vitest";
import { escaparComodinesDeLike } from "./escaparComodinesDeLike";

describe("escaparComodinesDeLike", () => {
  it("escapa _ para que no actue como comodin de un caracter", () => {
    expect(escaparComodinesDeLike("Calle 20_A")).toBe("Calle 20\\_A");
  });

  it("escapa % para que no traiga el catalogo entero", () => {
    expect(escaparComodinesDeLike("Calle 20%")).toBe("Calle 20\\%");
  });

  it("escapa la barra invertida sin doble escape", () => {
    expect(escaparComodinesDeLike("a\\b")).toBe("a\\\\b");
  });

  it("un nombre de calle sin comodines queda igual", () => {
    expect(escaparComodinesDeLike("Calle 21")).toBe("Calle 21");
  });
});
