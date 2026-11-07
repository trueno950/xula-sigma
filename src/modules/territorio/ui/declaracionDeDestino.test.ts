import { describe, expect, it } from "vitest";
import { declaracionDeDestino } from "./declaracionDeDestino";

describe("declaracionDeDestino", () => {
  it("explains municipality-wide colony and street-catalog choices", () => {
    expect(
      declaracionDeDestino({ origen: "municipio", tieneColonias: true }),
    ).toBe(
      "Se guarda en la colonia que elija o, si selecciona «Sin colonia», en el asentamiento de la calle. Cada calle pertenece al catálogo del asentamiento indicado junto a ella.",
    );
  });

  it("names the colonia once, in a natural sentence", () => {
    expect(
      declaracionDeDestino({
        origen: "lugar",
        tipo: "colonia",
        nombre: "Centro",
        asentamiento: "Motul",
        tieneColonias: true,
      }),
    ).toBe(
      "Se guarda en la colonia Centro. Las calles son del catálogo de Motul.",
    );
  });

  it("does not repeat the type when the name already starts with it", () => {
    expect(
      declaracionDeDestino({
        origen: "lugar",
        tipo: "colonia",
        nombre: "Colonia Prueba UX",
        asentamiento: "Motul",
        tieneColonias: true,
      }),
    ).toBe(
      "Se guarda en la Colonia Prueba UX. Las calles son del catálogo de Motul.",
    );
  });
});
