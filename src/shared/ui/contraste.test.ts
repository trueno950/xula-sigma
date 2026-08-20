import { describe, expect, it } from "vitest";
import { CONTRASTE_MINIMO, contraste, luminancia } from "./contraste";

describe("luminancia", () => {
  it("mide los extremos del canal", () => {
    expect(luminancia("#000000")).toBe(0);
    expect(luminancia("#ffffff")).toBeCloseTo(1, 5);
  });

  it("un hex de tres digitos es el de seis con cada digito repetido", () => {
    expect(luminancia("#f00")).toBeCloseTo(luminancia("#ff0000") ?? -1, 10);
  });

  it("mide oklch, que es lo que usa el design system", () => {
    // `globals.css` declara los valores por defecto en oklch. Si esta
    // funcion no los midiera, la marca por defecto no seria verificable y
    // la reja de contraste solo aplicaria a los municipios que eligen hex.
    expect(luminancia("oklch(0.99 0 0)")).toBeCloseTo(0.9703, 3);
    expect(luminancia("oklch(0.42 0.12 25)")).toBeCloseTo(0.0668, 3);
  });

  it("acepta la claridad en porcentaje", () => {
    expect(luminancia("oklch(42% 0.12 25)")).toBeCloseTo(
      luminancia("oklch(0.42 0.12 25)") ?? -1,
      10,
    );
  });

  it("lo que no se puede medir devuelve null", () => {
    for (const valor of [
      "oklch(0.5)",
      "oklch(0.5 0.1 20 30)",
      "oklch(0.5 50% 20)",
      "#12345",
      "rebeccapurple",
      "",
    ]) {
      expect(luminancia(valor)).toBeNull();
    }
  });
});

describe("contraste", () => {
  it("un color contra si mismo es 1", () => {
    expect(contraste("#7a1f2b", "#7a1f2b")).toBeCloseTo(1, 10);
  });

  it("negro contra blanco es 21, el maximo de la escala", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("no depende del orden de los argumentos", () => {
    expect(contraste("#7a1f2b", "#ffffff")).toBeCloseTo(
      contraste("#ffffff", "#7a1f2b") ?? -1,
      10,
    );
  });

  it("el guinda con texto negro no alcanza y con blanco si", () => {
    // El caso que motiva la reja, en `docs/06-frontend.md` seccion 6. Va
    // como test y no solo como numero en el doc para que el dia que la
    // conversion de color se toque, el guinda siga sin pasar.
    expect(contraste("#7a1f2b", "#000000")).toBeLessThan(CONTRASTE_MINIMO);
    expect(contraste("#7a1f2b", "#ffffff")).toBeGreaterThan(CONTRASTE_MINIMO);
  });

  it("si alguno no se puede medir, no hay contraste que reportar", () => {
    expect(contraste("#7a1f2b", "rebeccapurple")).toBeNull();
    expect(contraste("rebeccapurple", "#7a1f2b")).toBeNull();
  });
});
