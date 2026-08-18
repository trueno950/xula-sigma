import { describe, expect, it } from "vitest";
import { leerMarca, variablesDeMarca } from "./marca";

describe("leerMarca", () => {
  it("acepta una marca bien formada", () => {
    expect(
      leerMarca({
        primario: "#7a1f2b",
        escudo: "https://r2.example/escudo.png",
      }),
    ).toEqual({ primario: "#7a1f2b", escudo: "https://r2.example/escudo.png" });
  });

  it("no deja pasar un color que trae CSS adentro", () => {
    /**
     * El caso que justifica validar. Esos colores terminan en un atributo
     * `style` y salen de una columna `jsonb` que alguien edita: sin la lista
     * blanca, `red;background:url(//x)` se inyecta en el CSS de la pagina
     * que se sirve **antes de autenticar**.
     */
    const marca = leerMarca({ primario: "red;background:url(//maligno)" });

    expect(marca.primario).toBeUndefined();
    expect(JSON.stringify(variablesDeMarca(marca))).not.toContain("maligno");
  });

  it("un escudo que no es URL no se pinta", () => {
    expect(leerMarca({ escudo: "javascript:alert(1)" }).escudo).toBeUndefined();
  });

  it("una marca invalida cae entera a los valores por defecto", () => {
    /**
     * Se descarta el objeto completo y no campo por campo: una marca a
     * medias —primario del municipio, texto por defecto— puede quedar
     * ilegible, y es peor que la marca por defecto entera.
     */
    expect(leerMarca({ primario: "#7a1f2b", secundario: "url(//x)" })).toEqual(
      {},
    );
  });

  it("aguanta lo que venga de una columna jsonb", () => {
    for (const valor of [null, undefined, 42, "texto", [], {}]) {
      expect(leerMarca(valor)).toEqual({});
    }
  });
});

describe("variablesDeMarca", () => {
  it("solo declara las variables que el municipio definio", () => {
    // Una variable en vacio pisaria el valor por defecto de `globals.css`
    // con nada, y el color quedaria sin resolver.
    expect(variablesDeMarca({ primario: "#7a1f2b" })).toEqual({
      "--primary": "#7a1f2b",
    });
  });

  it("sin marca no declara ninguna", () => {
    expect(variablesDeMarca({})).toEqual({});
  });
});
