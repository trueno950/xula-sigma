import { describe, expect, it } from "vitest";
import { Folio } from "./folio";

describe("Folio.crear", () => {
  it("produce el formato REP-ANIO-consecutivo con seis digitos", () => {
    expect(Folio.crear(2026, 123).toString()).toBe("REP-2026-000123");
  });

  it("un consecutivo de siete digitos no trunca y sigue siendo unico", () => {
    expect(Folio.crear(2026, 1_000_001).toString()).toBe("REP-2026-1000001");
  });

  it("rechaza un consecutivo 0", () => {
    expect(() => Folio.crear(2026, 0)).toThrow();
  });

  it("rechaza un consecutivo no entero", () => {
    expect(() => Folio.crear(2026, 1.5)).toThrow();
  });
});
