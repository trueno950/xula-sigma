import { describe, expect, it } from "vitest";
import { descripcionDeFiltrosDeReportes } from "./descripcionDeFiltros";

describe("descripcionDeFiltrosDeReportes", () => {
  it("sin filtros ni busqueda no describe nada", () => {
    expect(descripcionDeFiltrosDeReportes({}, undefined)).toBeUndefined();
  });

  it("nombra estado y busqueda con la etiqueta legible", () => {
    expect(
      descripcionDeFiltrosDeReportes({ estado: "EN_ATENCION" }, "luz"),
    ).toBe('Estado "En atención", búsqueda "luz"');
  });

  it("nombra todos los filtros aplicados", () => {
    expect(
      descripcionDeFiltrosDeReportes(
        { estado: "RESUELTO", tipo: "ALUMBRADO" },
        "luz",
      ),
    ).toBe('Estado "Resuelto", tipo "Alumbrado", búsqueda "luz"');
  });
});
