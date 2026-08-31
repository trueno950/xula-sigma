import { describe, expect, it } from "vitest";
import { ESTADOS_DE_REPORTE, esTerminal, transicionValida } from "./estado";

/**
 * Tabla recorrida entera contra `ESTADOS_DE_REPORTE x ESTADOS_DE_REPORTE`,
 * forma de `roles.test.ts` (design.md seccion 7): un estado nuevo tiene que
 * faltar en esta tabla para que el test lo note, en vez de heredar "sin
 * transiciones" en silencio.
 *
 * `RECIBIDO -> RESUELTO` directo es valido (decision del usuario).
 */
const TRANSICIONES_ESPERADAS: Record<
  (typeof ESTADOS_DE_REPORTE)[number],
  readonly (typeof ESTADOS_DE_REPORTE)[number][]
> = {
  RECIBIDO: ["EN_ATENCION", "RESUELTO", "RECHAZADO"],
  EN_ATENCION: ["RESUELTO", "RECHAZADO"],
  RESUELTO: [],
  RECHAZADO: [],
};

describe("transicionValida", () => {
  for (const desde of ESTADOS_DE_REPORTE) {
    for (const hacia of ESTADOS_DE_REPORTE) {
      const esperado = TRANSICIONES_ESPERADAS[desde].includes(hacia);

      it(`transicionValida(${desde}, ${hacia}) === ${esperado}`, () => {
        expect(transicionValida(desde, hacia)).toBe(esperado);
      });
    }
  }

  it("RECIBIDO -> RESUELTO directo es valido", () => {
    expect(transicionValida("RECIBIDO", "RESUELTO")).toBe(true);
  });
});

describe("esTerminal", () => {
  it("RESUELTO y RECHAZADO son terminales", () => {
    expect(esTerminal("RESUELTO")).toBe(true);
    expect(esTerminal("RECHAZADO")).toBe(true);
  });

  it("RECIBIDO y EN_ATENCION no son terminales", () => {
    expect(esTerminal("RECIBIDO")).toBe(false);
    expect(esTerminal("EN_ATENCION")).toBe(false);
  });
});
