import { describe, expect, it } from "vitest";
import { esFolioDeReporte, Folio, normalizarFolio } from "./folio";

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

describe("esFolioDeReporte", () => {
  it.each(["REP-2026-000003", "REP-2026-1000001"])(
    "%s tiene la forma de un folio",
    (folio) => {
      expect(esFolioDeReporte(folio)).toBe(true);
    },
  );

  it.each([
    "",
    "rep-2026-000003",
    "REP-2026-3",
    "REP-26-000003",
    "REP-2026-000003 ",
    "11111111-1111-4111-8111-111111111111",
    "CONST-2026-000003",
  ])("%j no tiene la forma de un folio", (texto) => {
    expect(esFolioDeReporte(texto)).toBe(false);
  });

  it("todo folio que produce Folio.crear pasa", () => {
    expect(esFolioDeReporte(Folio.crear(2026, 42).toString())).toBe(true);
  });
});

describe("normalizarFolio", () => {
  it("recorta espacios y sube a mayusculas lo que teclea el operador", () => {
    expect(normalizarFolio("  rep-2026-000003 ")).toBe("REP-2026-000003");
  });
});
