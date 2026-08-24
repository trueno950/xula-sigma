import { describe, expect, it } from "vitest";
import { puedeContener, TIPOS_DE_LUGAR } from "./tipoDeLugar";

/**
 * Recorrida entera contra `TIPOS_DE_LUGAR`, forma de `roles.test.ts:15`
 * (design.md seccion 7): un sexto tipo tiene que faltar en esta tabla para
 * que el test lo note, en vez de heredar un permiso por descarte.
 */
const RANGO: Record<(typeof TIPOS_DE_LUGAR)[number], number> = {
  cabecera: 0,
  comisaria: 0,
  colonia: 1,
  sector: 2,
  manzana: 3,
};

describe("puedeContener", () => {
  it("cabecera y comisaria no se contienen entre si (mismo rango 0)", () => {
    expect(puedeContener("cabecera", "comisaria")).toBe(false);
    expect(puedeContener("comisaria", "cabecera")).toBe(false);
  });

  for (const padre of TIPOS_DE_LUGAR) {
    for (const hijo of TIPOS_DE_LUGAR) {
      const esperado = RANGO[padre] < RANGO[hijo];

      it(`puedeContener(${padre}, ${hijo}) === ${esperado}`, () => {
        expect(puedeContener(padre, hijo)).toBe(esperado);
      });
    }
  }
});
