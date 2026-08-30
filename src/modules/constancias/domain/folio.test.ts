import { describe, expect, it } from "vitest";
import { Folio } from "./folio";

describe("Folio.crear", () => {
  it("produce el formato PREFIJO-ANIO-consecutivo con seis digitos", () => {
    expect(Folio.crear("VEC", 2026, 1).toString()).toBe("VEC-2026-000001");
  });

  it("un consecutivo de siete digitos no trunca y sigue siendo unico", () => {
    // spec: "El consecutivo un millon uno no rompe la unicidad".
    expect(Folio.crear("VEC", 2026, 1_000_001).toString()).toBe(
      "VEC-2026-1000001",
    );
  });

  it("rechaza un consecutivo 0", () => {
    expect(() => Folio.crear("VEC", 2026, 0)).toThrow();
  });

  it("rechaza un consecutivo no entero", () => {
    expect(() => Folio.crear("VEC", 2026, 1.5)).toThrow();
  });
});
