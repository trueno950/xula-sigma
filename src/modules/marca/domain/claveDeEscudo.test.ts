import { describe, expect, it } from "vitest";
import { claveDeEscudo } from "./claveDeEscudo";

describe("claveDeEscudo", () => {
  it("empieza con el ayuntamientoId y termina con el uuid recibido", () => {
    const ayuntamientoId = "11111111-1111-1111-8111-111111111111";
    const uuid = "22222222-2222-2222-8222-222222222222";

    expect(claveDeEscudo(ayuntamientoId, uuid)).toBe(
      `${ayuntamientoId}/escudo-${uuid}.png`,
    );
  });

  it("el uuid entra por parametro y no se genera adentro", () => {
    // Sin esto, dos llamadas con el mismo par de argumentos podrian dar
    // claves distintas y el test no lo notaria.
    const ayuntamientoId = "11111111-1111-1111-8111-111111111111";
    const uuid = "33333333-3333-3333-8333-333333333333";

    expect(claveDeEscudo(ayuntamientoId, uuid)).toBe(
      claveDeEscudo(ayuntamientoId, uuid),
    );
  });
});
