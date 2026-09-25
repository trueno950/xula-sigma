import { describe, expect, it } from "vitest";
import { opcionesEtiquetadas } from "./opcionesDeLista";

describe("opcionesEtiquetadas", () => {
  it("el valor es el codigo y la etiqueta es lo que ve la persona", () => {
    const opciones = opcionesEtiquetadas(["A_B", "C"], {
      A_B: "A be",
      C: "Ce",
    });

    expect(opciones).toEqual([
      { valor: "A_B", etiqueta: "A be" },
      { valor: "C", etiqueta: "Ce" },
    ]);
  });

  it("conserva el orden del catalogo, no el de la tabla de etiquetas", () => {
    const opciones = opcionesEtiquetadas(["Z", "A"], { A: "a", Z: "z" });

    expect(opciones.map((opcion) => opcion.valor)).toEqual(["Z", "A"]);
  });
});
