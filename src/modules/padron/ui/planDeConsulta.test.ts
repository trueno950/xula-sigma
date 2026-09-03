import { describe, expect, it } from "vitest";
import { planDeConsulta } from "./planDeConsulta";

const contador = () => {
  let actual = 0;
  return () => ++actual;
};

describe("planDeConsulta", () => {
  it("con algo escrito busca, y arma la cadena con los dos campos", () => {
    expect(planDeConsulta("Juan", "Poot", contador())).toEqual({
      tipo: "buscar",
      id: 1,
      cadena: "Juan Poot",
    });
  });

  it("con un solo campo busca igual, sin el espacio colgando", () => {
    expect(planDeConsulta("Juan", "", contador())).toEqual({
      tipo: "buscar",
      id: 1,
      cadena: "Juan",
    });
  });

  /**
   * El caso que motivo el archivo. Vaciar los campos tiene que consumir un
   * numero: es lo que deja fuera de vigencia a la consulta que ya salio.
   */
  it("vaciar los campos avanza el numero, no solo limpia", () => {
    const siguiente = contador();

    const enVuelo = planDeConsulta("Juan", "Poot", siguiente);
    const alVaciar = planDeConsulta("", "  ", siguiente);

    expect(alVaciar.tipo).toBe("limpiar");
    expect(alVaciar.id).toBe(2);
    expect(enVuelo.id).not.toBe(alVaciar.id);
  });
});
