import { describe, expect, it } from "vitest";
import { comoPersonaId, esPersonaId } from "./personaId";

describe("esPersonaId", () => {
  it("acepta un UUID valido", () => {
    expect(esPersonaId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("rechaza una cadena que no es UUID", () => {
    expect(esPersonaId("persona-1")).toBe(false);
  });
});

describe("comoPersonaId", () => {
  it("devuelve el valor cuando es un UUID valido", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";

    expect(comoPersonaId(id)).toBe(id);
  });

  it("lanza cuando el valor no es un UUID", () => {
    expect(() => comoPersonaId("persona-1")).toThrow(/persona_id invalido/);
  });
});
