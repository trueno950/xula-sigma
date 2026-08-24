import { describe, expect, it } from "vitest";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  comoResidenciaId,
} from "./identificadores";

const UUID_VALIDO = "8d9773f3-35a0-46ac-9b34-f49606430c5c";

describe.each([
  ["comoLugarId", comoLugarId],
  ["comoCalleId", comoCalleId],
  ["comoDomicilioId", comoDomicilioId],
  ["comoResidenciaId", comoResidenciaId],
] as const)("%s", (_nombre, comoId) => {
  it("acepta un UUID valido", () => {
    expect(comoId(UUID_VALIDO)).toBe(UUID_VALIDO);
  });

  it("rechaza un valor que no es UUID", () => {
    expect(() => comoId("lugar-1")).toThrow();
  });
});
