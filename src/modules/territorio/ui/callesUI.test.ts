import { describe, expect, it } from "vitest";
import { comoLugarId } from "../domain";
import { destinosDeMovimiento, formatoDePunto } from "./vistaDeCalles";

describe("presentacion del catalogo de calles", () => {
  it("muestra el estado explicito de una calle sin punto", () => {
    expect(formatoDePunto(null)).toBe("sin punto");
    expect(formatoDePunto({ latitud: 20.937, longitud: -89.6237 })).toBe(
      "20.937000, -89.623700",
    );
  });

  it("excluye del movimiento el lugar donde ya vive la calle", () => {
    const actual = comoLugarId("11111111-1111-4111-8111-111111111111");
    const destino = comoLugarId("22222222-2222-4222-8222-222222222222");

    expect(
      destinosDeMovimiento(actual, [
        { id: actual, nombre: "Centro", tipo: "cabecera" },
        { id: destino, nombre: "San Juan", tipo: "comisaria" },
        {
          id: comoLugarId("33333333-3333-4333-8333-333333333333"),
          nombre: "Sector 1",
          tipo: "sector",
        },
      ]),
    ).toEqual([{ id: destino, nombre: "San Juan", tipo: "comisaria" }]);
  });
});
