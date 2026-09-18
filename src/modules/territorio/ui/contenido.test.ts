import { describe, expect, it } from "vitest";
import { domiciliosDirectosDe, hermanosDeDireccion } from "./contenido";
import {
  cabeceraId,
  calleId,
  coloniaId,
  enColonia,
  enManzana,
  hermano,
  nodoDomicilio,
  nodos,
  otraCalleId,
} from "./contenidoDePrueba";

describe("domiciliosDirectosDe", () => {
  it("devuelve solo los domicilios colgados de ese lugar", () => {
    expect(domiciliosDirectosDe(nodos, coloniaId)).toEqual([
      enColonia,
      hermano,
    ]);
    expect(domiciliosDirectosDe(nodos, coloniaId)).not.toContainEqual(
      enManzana,
    );
  });

  it("trae la calle y el numero de cada nodo, sin el listado del municipio", () => {
    const [primero] = domiciliosDirectosDe(nodos, coloniaId);

    expect(primero).toMatchObject({ calle: "Calle 21", calleId, numero: "5" });
  });

  it("sin domicilios colgados devuelve vacio", () => {
    expect(domiciliosDirectosDe(nodos, cabeceraId)).toEqual([]);
  });
});

describe("hermanosDeDireccion", () => {
  const seleccionado = { id: enColonia.id, calleId, numero: "5" };

  it("encuentra los otros domicilios con la misma calle y el mismo numero", () => {
    expect(hermanosDeDireccion(nodos, seleccionado)).toEqual([hermano]);
  });

  it("no se cuenta a si mismo", () => {
    expect(hermanosDeDireccion(nodos, seleccionado)).not.toContainEqual(
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
      hermanosDeDireccion([...nodos, conOtroNumero], seleccionado),
    ).toEqual([hermano]);
  });

  it("una calle distinta no es la misma direccion, aunque se llame igual", () => {
    const enOtraCalle = nodoDomicilio(
      "99999999-9999-4999-8999-999999999999",
      coloniaId,
      { calleId: otraCalleId },
    );

    expect(hermanosDeDireccion([...nodos, enOtraCalle], seleccionado)).toEqual([
      hermano,
    ]);
  });

  it("sin numero no hay direccion que comparar", () => {
    expect(
      hermanosDeDireccion(nodos, { ...seleccionado, numero: null }),
    ).toEqual([]);
  });

  /**
   * Los hermanos salen del subarbol que la pagina ya trae. Todo domicilio
   * de una calle cuelga del subarbol del asentamiento de esa calle
   * (`verificacionDeDomicilio.ts`, `exigirCallesDelAsentamiento`), que es
   * el subarbol que la pantalla carga.
   */
  it("no alcanza a un domicilio fuera del subarbol cargado", () => {
    expect(hermanosDeDireccion([enColonia], seleccionado)).toEqual([]);
  });
});
