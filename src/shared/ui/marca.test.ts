import { describe, expect, it } from "vitest";
import { leerMarca } from "@/shared/marca";
import { variablesDeMarca } from "./marca";

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

  it("el acento se declara sin pasar por la reja de contraste", () => {
    // Por que el acento no se mide, en `legible` (`shared/marca/validacion.ts`).
    // Lo que agrega este test es fijar el hueco con el numero adentro: el
    // par elegido no alcanza el piso y se declara igual. El dia que el
    // design system declare el color de texto del acento, eso pasa a
    // estar mal y rompe aca.
    const marca = leerMarca({ primario: "#1f4d7a", secundario: "#000000" });

    expect(variablesDeMarca(marca)).toEqual({
      "--primary": "#1f4d7a",
      "--accent": "#000000",
    });
  });

  it("un color rechazado por leerMarca no llega al style pintado", () => {
    /**
     * El caso que justifica validar antes de pintar: `red;background:url`
     * viene de una columna `jsonb` que alguien edita. Sin la lista blanca
     * de `shared/marca/validacion.ts`, ese texto se inyectaria en el CSS
     * de la pagina que se sirve **antes de autenticar**.
     */
    const marca = leerMarca({ primario: "red;background:url(//maligno)" });

    expect(JSON.stringify(variablesDeMarca(marca))).not.toContain("maligno");
  });
});
