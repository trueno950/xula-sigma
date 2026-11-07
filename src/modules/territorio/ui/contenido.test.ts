import { describe, expect, it } from "vitest";
import { hermanosDeDireccion } from "./contenido";
import {
  calleId,
  coloniaId,
  enColonia,
  enOtraColonia,
  hermano,
  nodoDomicilio,
  otraCalleId,
} from "./contenidoDePrueba";

/** Los candidatos que la pagina lee por calle y numero, sin recortar. */
const candidatos = [enColonia, hermano, enOtraColonia];

describe("hermanosDeDireccion", () => {
  const seleccionado = { id: enColonia.id, calleId, numero: "5" };

  it("encuentra los otros domicilios con la misma calle y el mismo numero", () => {
    expect(hermanosDeDireccion(candidatos, seleccionado)).toEqual([hermano]);
  });

  it("no se cuenta a si mismo", () => {
    expect(hermanosDeDireccion(candidatos, seleccionado)).not.toContainEqual(
      enColonia,
    );
  });

  it("un numero distinto no es la misma direccion", () => {
    const conOtroNumero = nodoDomicilio(
      "99999999-9999-4999-8999-999999999999",
      coloniaId,
      { numero: "7" },
    );

    expect(
      hermanosDeDireccion([...candidatos, conOtroNumero], seleccionado),
    ).toEqual([hermano]);
  });

  it("una calle distinta no es la misma direccion, aunque se llame igual", () => {
    const enOtraCalle = nodoDomicilio(
      "99999999-9999-4999-8999-999999999999",
      coloniaId,
      { calleId: otraCalleId },
    );

    expect(
      hermanosDeDireccion([...candidatos, enOtraCalle], seleccionado),
    ).toEqual([hermano]);
  });

  it("sin numero no hay direccion que comparar", () => {
    expect(
      hermanosDeDireccion(candidatos, { ...seleccionado, numero: null }),
    ).toEqual([]);
  });

  it("solo compara contra los candidatos que recibe", () => {
    expect(hermanosDeDireccion([enColonia], seleccionado)).toEqual([]);
  });
});
