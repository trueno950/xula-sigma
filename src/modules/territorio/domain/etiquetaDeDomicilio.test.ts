import { describe, expect, it } from "vitest";
import { calleYNumero, etiquetaDeDomicilio } from "./etiquetaDeDomicilio";

describe("etiquetaDeDomicilio", () => {
  it("escribe el numero con # y el lugar antes de la raiz", () => {
    expect(
      etiquetaDeDomicilio({
        calle: "Calle 20",
        numero: "42-B",
        lugar: "Colonia Centro",
        raiz: "Motul",
      }),
    ).toBe("Calle 20 #42-B, Colonia Centro, Motul");
  });

  it("sin numero dice «sin número», nunca S/N", () => {
    expect(
      etiquetaDeDomicilio({
        calle: "Calle 20",
        numero: null,
        lugar: "Colonia Centro",
        raiz: "Motul",
      }),
    ).toBe("Calle 20 sin número, Colonia Centro, Motul");
  });

  it("no repite el lugar cuando es la raiz misma", () => {
    expect(
      etiquetaDeDomicilio({
        calle: "Calle 20",
        numero: null,
        lugar: "Motul",
        raiz: "Motul",
      }),
    ).toBe("Calle 20 sin número, Motul");
  });

  it("sin raiz conocida cierra con el lugar", () => {
    expect(
      etiquetaDeDomicilio({
        calle: "Calle 21",
        numero: "12",
        lugar: "Tepakan",
      }),
    ).toBe("Calle 21 #12, Tepakan");
  });
});

describe("calleYNumero", () => {
  it("es el primer tramo de la etiqueta, para las vistas que ya muestran el lugar", () => {
    expect(calleYNumero({ calle: "Calle 20", numero: "42-B" })).toBe(
      "Calle 20 #42-B",
    );
    expect(calleYNumero({ calle: "Calle 20", numero: null })).toBe(
      "Calle 20 sin número",
    );
  });
});
