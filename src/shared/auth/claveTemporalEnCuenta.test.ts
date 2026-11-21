import { describe, expect, it } from "vitest";
import {
  estadoDeClaveTemporal,
  HORAS_DE_VIGENCIA_DE_CLAVE_TEMPORAL,
} from "./claveTemporalEnCuenta";

/**
 * S1: la temporal caduca a las 24 horas. La comparacion es de instantes, no
 * de calendario: por eso los casos se arman sobre una fecha fija en UTC y no
 * sobre `new Date()`, que en el servidor corre en UTC y en una prueba local
 * en la hora de Merida.
 */

const AHORA = new Date("2026-03-10T23:30:00.000Z");

const emitidaHace = (horas: number): Date =>
  new Date(AHORA.getTime() - horas * 3_600_000);

describe("estado de la clave temporal", () => {
  it("una credencial sin marca es una clave propia", () => {
    expect(estadoDeClaveTemporal(null, AHORA)).toBe("propia");
  });

  it("una temporal de hace 23 horas sigue sirviendo", () => {
    expect(estadoDeClaveTemporal(emitidaHace(23), AHORA)).toBe(
      "temporal-vigente",
    );
  });

  it("a las 24 horas exactas ya caduco", () => {
    const emitida = emitidaHace(HORAS_DE_VIGENCIA_DE_CLAVE_TEMPORAL);

    expect(estadoDeClaveTemporal(emitida, AHORA)).toBe("temporal-caducada");
  });

  it("una temporal de ayer caduco", () => {
    expect(estadoDeClaveTemporal(emitidaHace(25), AHORA)).toBe(
      "temporal-caducada",
    );
  });

  it("mide el instante y no la fecha civil: cruzar medianoche no caduca", () => {
    // Emitida a las 23:30 del 9 de marzo, vista a las 22:00 del 10: son 22,5
    // horas —dos fechas distintas y todavia vigente—.
    expect(
      estadoDeClaveTemporal(
        new Date("2026-03-09T23:30:00.000Z"),
        new Date("2026-03-10T22:00:00.000Z"),
      ),
    ).toBe("temporal-vigente");
    expect(
      estadoDeClaveTemporal(
        new Date("2026-03-09T23:30:00.000Z"),
        new Date("2026-03-10T23:31:00.000Z"),
      ),
    ).toBe("temporal-caducada");
  });
});
