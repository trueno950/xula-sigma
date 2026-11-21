import { describe, expect, it } from "vitest";
import { estadoDeClaveTemporal } from "./claveTemporalEnCuenta";

const AHORA = new Date("2026-03-10T23:30:00.000Z");
const hace = (ms: number) => new Date(AHORA.getTime() - ms);
const VEINTICUATRO_HORAS = 86_400_000;

describe("S1 de usuarios-seguridad: el borde de las 24 horas", () => {
  it("un milisegundo antes de las 24 h sigue vigente", () => {
    expect(estadoDeClaveTemporal(hace(VEINTICUATRO_HORAS - 1), AHORA)).toBe(
      "temporal-vigente",
    );
  });

  it("a las 24 h exactas ya caduco", () => {
    expect(estadoDeClaveTemporal(hace(VEINTICUATRO_HORAS), AHORA)).toBe(
      "temporal-caducada",
    );
  });
});
