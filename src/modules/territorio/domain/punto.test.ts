import { describe, expect, it } from "vitest";
import { CAJA_DE_YUCATAN, estaEnYucatan, redondearPunto } from "./punto";

describe("punto geografico", () => {
  it.each([
    [CAJA_DE_YUCATAN.latitudMinima, CAJA_DE_YUCATAN.longitudMinima],
    [CAJA_DE_YUCATAN.latitudMinima, CAJA_DE_YUCATAN.longitudMaxima],
    [CAJA_DE_YUCATAN.latitudMaxima, CAJA_DE_YUCATAN.longitudMinima],
    [CAJA_DE_YUCATAN.latitudMaxima, CAJA_DE_YUCATAN.longitudMaxima],
  ])("acepta los cuatro bordes: %d, %d", (latitud, longitud) => {
    expect(estaEnYucatan({ latitud, longitud })).toBe(true);
  });

  it.each([
    [CAJA_DE_YUCATAN.latitudMinima - 0.0001, -89.5],
    [CAJA_DE_YUCATAN.latitudMaxima + 0.0001, -89.5],
    [20.5, CAJA_DE_YUCATAN.longitudMinima - 0.0001],
    [20.5, CAJA_DE_YUCATAN.longitudMaxima + 0.0001],
  ])("rechaza un punto fuera de la caja: %d, %d", (latitud, longitud) => {
    expect(estaEnYucatan({ latitud, longitud })).toBe(false);
  });

  it("redondea cada coordenada a seis decimales", () => {
    expect(
      redondearPunto({ latitud: 20.93700049, longitud: -89.62370051 }),
    ).toEqual({ latitud: 20.937, longitud: -89.623701 });
  });

  it("conserva la precision ya expresada en seis decimales", () => {
    const punto = { latitud: 19.4333, longitud: -87.4833 };

    expect(redondearPunto(punto)).toEqual(punto);
  });
});
