import { describe, expect, it } from "vitest";
import type { ConteoDeLugar } from "../application/puertosDeContenidoDeLugares";
import { cuentasDeLugar } from "./contenido";
import {
  cabecera,
  cabeceraId,
  calleDeLaCabecera,
  calleDeLaColonia,
  calleDeLaOtraColonia,
  colonia,
  nodos,
} from "./contenidoDePrueba";

const conteo = (domicilios: number): ConteoDeLugar => ({
  lugarId: cabeceraId,
  domicilios,
  calles: null,
});

describe("cuentasDeLugar", () => {
  /**
   * La vista de un lugar ya no trae los domicilios del subarbol: la cuenta
   * de la pestana sale de `contarContenidoDeLugares`, la misma consulta
   * agrupada de las filas de Lugares, que baja por todo el subarbol.
   */
  it("la cuenta de domicilios es la del subarbol que trae el conteo del lugar", () => {
    const cuentas = cuentasDeLugar({
      nodos,
      calles: [],
      nodo: cabecera,
      conteos: [conteo(7)],
    });

    expect(cuentas.domicilios).toBe(7);
  });

  it("si el conteo fallo, la pestana no inventa un cero", () => {
    const cuentas = cuentasDeLugar({ nodos, calles: [], nodo: cabecera });

    expect(cuentas.domicilios).toBeUndefined();
  });

  /** La pestana lista el catalogo del asentamiento: el numero no puede ser 0. */
  it("un nodo sin catalogo propio cuenta las calles heredadas que la pestana lista", () => {
    const cuentas = cuentasDeLugar({
      nodos,
      calles: [calleDeLaColonia],
      nodo: colonia,
    });

    expect(cuentas.calles).toBe(1);
  });

  it("un nodo con catalogo propio cuenta solo sus calles", () => {
    const cuentas = cuentasDeLugar({
      nodos,
      calles: [calleDeLaCabecera, calleDeLaColonia, calleDeLaOtraColonia],
      nodo: cabecera,
    });

    expect(cuentas.calles).toBe(1);
  });

  it("cuenta los lugares hijos directos", () => {
    const cuentas = cuentasDeLugar({ nodos, calles: [], nodo: cabecera });

    expect(cuentas.lugares).toBe(2);
  });
});
