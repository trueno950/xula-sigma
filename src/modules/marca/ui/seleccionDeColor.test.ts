import { describe, expect, it } from "vitest";
import { PALETA, PRIMARIO_POR_DEFECTO } from "@/shared/marca";
import {
  colorElegido,
  HEX_POR_DEFECTO,
  seleccionDeColor,
  VALOR_LIBRE,
} from "./seleccionDeColor";

/**
 * Las dos reglas del formulario que no son pintar: que opcion arranca
 * marcada y de donde sale el color cuando la operadora elige "Otro color".
 * Viven aca y no dentro del `.tsx` porque las comparten el formulario del
 * servidor y la isla de la muestra, y una copia que divergiera mostraria en
 * vivo un color distinto del que se guarda.
 */

const colorDeLaPaleta = (nombre: string): string =>
  PALETA.find((color) => color.nombre === nombre)?.valor ?? "";

const datos = (campos: Record<string, string>): FormData => {
  const formData = new FormData();

  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }

  return formData;
};

describe("seleccionDeColor", () => {
  it("un color de la paleta marca su propia opcion", () => {
    const verde = colorDeLaPaleta("Verde");

    expect(seleccionDeColor(verde).radio).toBe(verde);
  });

  it("un hex guardado marca la opcion libre y precarga el selector", () => {
    expect(seleccionDeColor("#123456")).toEqual({
      radio: VALOR_LIBRE,
      libre: "#123456",
    });
  });

  it("un hex de tres digitos se expande, que es lo unico que el selector admite", () => {
    expect(seleccionDeColor("#0a0").libre).toBe("#00aa00");
  });

  it("sin color guardado arranca en el primario por defecto", () => {
    expect(seleccionDeColor(undefined).radio).toBe(PRIMARIO_POR_DEFECTO);
    expect(seleccionDeColor(undefined).libre).toBe(HEX_POR_DEFECTO);
  });

  it("un oklch que la paleta no tiene no deja el formulario sin color elegido", () => {
    // Sin ninguna opcion marcada el POST no lleva `primario` y la accion
    // responderia "elija un color" sobre un color que la marca si tiene.
    expect(seleccionDeColor("oklch(0.5 0.1 100)").radio).toBe(
      PRIMARIO_POR_DEFECTO,
    );
  });
});

describe("colorElegido", () => {
  it("toma el color de la paleta cuando la opcion marcada es una de ellas", () => {
    const morado = colorDeLaPaleta("Morado");

    expect(colorElegido(datos({ primario: morado }), "primario")).toBe(morado);
  });

  it("toma el selector libre cuando la opcion marcada es Otro color", () => {
    expect(
      colorElegido(
        datos({ primario: VALOR_LIBRE, primarioLibre: "#123456" }),
        "primario",
      ),
    ).toBe("#123456");
  });

  it("no mezcla los dos campos: el secundario se lee de los suyos", () => {
    expect(
      colorElegido(
        datos({
          primario: colorDeLaPaleta("Guinda"),
          secundario: VALOR_LIBRE,
          secundarioLibre: "#654321",
        }),
        "secundario",
      ),
    ).toBe("#654321");
  });

  it("sin campo devuelve vacio, para que el esquema lo rechace", () => {
    expect(colorElegido(datos({}), "primario")).toBe("");
    expect(colorElegido(datos({ primario: VALOR_LIBRE }), "primario")).toBe("");
  });
});
