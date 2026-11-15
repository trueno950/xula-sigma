import { describe, expect, it } from "vitest";
import { contraste } from "./contraste";
import { TEXTO_CLARO, TEXTO_OSCURO, textoSobre } from "./textoAutomatico";

describe("textoSobre", () => {
  it("sobre un color oscuro devuelve blanco", () => {
    expect(textoSobre("oklch(0.42 0.12 25)")).toBe(TEXTO_CLARO);
    expect(textoSobre("#1b1b1b")).toBe(TEXTO_CLARO);
  });

  it("sobre un color claro devuelve negro", () => {
    expect(textoSobre("#ffd700")).toBe(TEXTO_OSCURO);
    expect(textoSobre("oklch(0.84 0.14 90)")).toBe(TEXTO_OSCURO);
  });

  it("devuelve el que de verdad contrasta mas, no el que se le parece", () => {
    // Los dos candidatos se miden y se compara la razon, en vez de decidir
    // por la luminancia del fondo contra un umbral: el umbral es una
    // aproximacion y la comparacion es exacta.
    for (const fondo of [
      "#ffd700",
      "oklch(0.84 0.14 90)",
      "oklch(0.42 0.12 25)",
      "#777777",
      "oklch(0.5 0.09 190)",
    ]) {
      const elegido = textoSobre(fondo);
      const otro = elegido === TEXTO_CLARO ? TEXTO_OSCURO : TEXTO_CLARO;

      expect(contraste(fondo, elegido ?? "")).toBeGreaterThanOrEqual(
        contraste(fondo, otro) ?? 0,
      );
    }
  });

  it("un fondo que no se puede medir devuelve null", () => {
    // No es "no hay texto": es "no se puede garantizar legible", y quien
    // pregunta tiene que poder distinguirlo.
    expect(textoSobre("oklch(0.5)")).toBeNull();
    expect(textoSobre("rebeccapurple")).toBeNull();
  });
});
