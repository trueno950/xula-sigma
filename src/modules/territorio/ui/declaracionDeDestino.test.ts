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
});
