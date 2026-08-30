import { describe, expect, it } from "vitest";
import { PREFIJOS, TIPOS_DE_DOCUMENTO } from "./tipoDeDocumento";

/**
 * Forma de tabla de `roles.test.ts`: se recorre `TIPOS_DE_DOCUMENTO`
 * entero para que un tipo nuevo **falte** en `PREFIJOS` en vez de heredar
 * un prefijo por descarte.
 */
describe("PREFIJOS", () => {
  it.each(TIPOS_DE_DOCUMENTO)("tiene un prefijo definido para %s", (tipo) => {
    expect(typeof PREFIJOS[tipo]).toBe("string");
    expect(PREFIJOS[tipo].length).toBeGreaterThan(0);
  });

  it("VECINDAD usa el prefijo VEC", () => {
    expect(PREFIJOS.VECINDAD).toBe("VEC");
  });
});
