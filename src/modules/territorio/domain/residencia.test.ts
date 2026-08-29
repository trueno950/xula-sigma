import { describe, expect, it } from "vitest";
import { vigenciaValida } from "./residencia";

/**
 * Espejo en TypeScript del CHECK `residencias_vigencia` (design.md seccion
 * 8): una residencia sin cerrar (`hastaEn` null) o cerrada en o despues de
 * `desdeEn` es valida.
 */
describe("vigenciaValida", () => {
  it("hastaEn null es valida", () => {
    expect(vigenciaValida("2020-01-01", null)).toBe(true);
  });

  it("hastaEn igual a desdeEn es valida: cerrar y abrir el mismo dia es valido", () => {
    expect(vigenciaValida("2020-01-01", "2020-01-01")).toBe(true);
  });

  it("hastaEn posterior a desdeEn es valida", () => {
    expect(vigenciaValida("2020-01-01", "2020-06-15")).toBe(true);
  });

  it("hastaEn anterior a desdeEn no es valida", () => {
    expect(vigenciaValida("2020-06-15", "2020-01-01")).toBe(false);
  });
});
