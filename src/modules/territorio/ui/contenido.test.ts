import { describe, expect, it } from "vitest";
import { comoDomicilioId } from "../domain";
import { hermanosDeDireccion, rutaDe } from "./contenido";
import {
  cabeceraId,
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

const corregirElDomicilio = {
  raizId: cabeceraId,
  nodoId: coloniaId,
  vista: "domicilios" as const,
  accion: "corregirDomicilio" as const,
  domicilioId: comoDomicilioId("44444444-4444-4444-8444-444444444444"),
};
const PERSONA = "88888888-8888-4888-8888-888888888888";

/** S4 de `territorio-advertencias`: la ruta conserva de donde vino el operador. */
describe("rutaDe", () => {
  it("sin regreso arma la misma ruta de siempre", () => {
    expect(rutaDe(corregirElDomicilio)).toBe(
      `/territorio?raiz=${cabeceraId}&nodo=${coloniaId}&vista=domicilios&accion=corregirDomicilio&domicilio=${corregirElDomicilio.domicilioId}`,
    );
  });

  it("con regreso lo agrega escapado, para que no rompa la consulta", () => {
    expect(
      rutaDe({ ...corregirElDomicilio, regreso: `/padron/${PERSONA}` }),
    ).toBe(
      `/territorio?raiz=${cabeceraId}&nodo=${coloniaId}&vista=domicilios&accion=corregirDomicilio&domicilio=${corregirElDomicilio.domicilioId}&regreso=%2Fpadron%2F${PERSONA}`,
    );
  });
});
