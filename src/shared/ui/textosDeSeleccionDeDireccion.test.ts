import { describe, expect, it } from "vitest";
import { textosDeSeleccionDeDireccion } from "./textosDeSeleccionDeDireccion";

describe("textosDeSeleccionDeDireccion", () => {
  it("conserva los textos exactos del alta de reportes cuando ofrece lugar y calle", () => {
    const textos = textosDeSeleccionDeDireccion({
      etiquetaDeLista: "Dirección para el reporte",
      alternativa: "Puede indicar lugar y calle.",
    });

    expect(textos).toEqual({
      etiquetaDeLista: "Dirección para el reporte",
      sinResultados:
        "No se encontraron direcciones. Puede indicar lugar y calle.",
      fallo: "No se pudo buscar direcciones. Puede indicar lugar y calle.",
    });
  });

  it("no promete una alternativa que el formulario no ofrece", () => {
    const textos = textosDeSeleccionDeDireccion({
      etiquetaDeLista: "Domicilio",
    });

    expect(textos).toEqual({
      etiquetaDeLista: "Domicilio",
      sinResultados: "No se encontraron direcciones.",
      fallo: "No se pudo buscar direcciones.",
    });
  });
});
