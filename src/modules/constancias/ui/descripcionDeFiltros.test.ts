import { describe, expect, it } from "vitest";
import { descripcionDeFiltrosDeConstancias } from "./descripcionDeFiltros";

describe("descripcionDeFiltrosDeConstancias", () => {
  it("sin filtros ni busqueda no describe nada", () => {
    expect(descripcionDeFiltrosDeConstancias({}, undefined)).toBeUndefined();
  });

  it("nombra estado y busqueda con la etiqueta legible", () => {
    expect(
      descripcionDeFiltrosDeConstancias({ estado: "CANCELADA" }, "gomez"),
    ).toBe('Estado "Cancelada", búsqueda "gomez"');
  });
});
