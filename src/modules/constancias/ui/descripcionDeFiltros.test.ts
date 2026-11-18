import { describe, expect, it } from "vitest";
import {
  descripcionDeFiltrosDeConstancias,
  descripcionDelOrdenDeConstancias,
} from "./descripcionDeFiltros";

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

describe("descripcionDelOrdenDeConstancias", () => {
  it("sin orden pedido describe el default de la lectura", () => {
    expect(descripcionDelOrdenDeConstancias(undefined)).toBe(
      "por fecha de emisión, de la más reciente a la más vieja",
    );
  });

  it("nombra la fecha de emision al reves", () => {
    expect(
      descripcionDelOrdenDeConstancias({
        campo: "emitida",
        direccion: "asc",
      }),
    ).toBe("por fecha de emisión, de la más vieja a la más reciente");
  });

  it("nombra el folio en las dos direcciones", () => {
    expect(
      descripcionDelOrdenDeConstancias({ campo: "folio", direccion: "asc" }),
    ).toBe("por folio, del más viejo al más reciente");
    expect(
      descripcionDelOrdenDeConstancias({ campo: "folio", direccion: "desc" }),
    ).toBe("por folio, del más reciente al más viejo");
  });
});
