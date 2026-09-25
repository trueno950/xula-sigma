import { describe, expect, it } from "vitest";
import { comoLugarId } from "../domain";
import { opcionesDeLugares, opcionesDeTipos } from "./opciones";

describe("opciones de lugares y tipos", () => {
  it("el lugar dice su tipo con etiqueta y el valor sigue siendo el id", () => {
    const id = comoLugarId("11111111-1111-4111-8111-111111111111");

    expect(
      opcionesDeLugares([{ id, nombre: "Yaxché", tipo: "comisaria" }]),
    ).toEqual([{ valor: id, etiqueta: "Yaxché (comisaría)" }]);
  });

  it("el tipo se ofrece con etiqueta y el codigo como valor", () => {
    expect(opcionesDeTipos(["cabecera", "comisaria"])).toEqual([
      { valor: "cabecera", etiqueta: "Cabecera" },
      { valor: "comisaria", etiqueta: "Comisaría" },
    ]);
  });
});
