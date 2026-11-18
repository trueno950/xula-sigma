import { describe, expect, it } from "vitest";
import { etiquetaPorPersona } from "./domiciliosVigentes";

describe("etiquetaPorPersona", () => {
  it("la etiqueta de la terminal manda sobre la de su perdedora", () => {
    const grupos = new Map([["ganadora", ["ganadora", "perdedora"]]]);
    const etiquetas = new Map([
      ["ganadora", "Calle 20 #12, Centro"],
      ["perdedora", "Calle 8 #1, Kini"],
    ]);

    expect(etiquetaPorPersona(grupos, etiquetas).get("ganadora")).toBe(
      "Calle 20 #12, Centro",
    );
  });

  it("una persona fusionada toma el domicilio que conserva su perdedora", () => {
    const grupos = new Map([["ganadora", ["ganadora", "perdedora"]]]);
    const etiquetas = new Map([["perdedora", "Calle 8 #1, Kini"]]);

    expect(etiquetaPorPersona(grupos, etiquetas).get("ganadora")).toBe(
      "Calle 8 #1, Kini",
    );
  });

  it("sin residencia vigente la persona no aparece en el mapa", () => {
    const grupos = new Map([["sola", ["sola"]]]);

    expect(etiquetaPorPersona(grupos, new Map()).has("sola")).toBe(false);
  });
});
