import { describe, expect, it } from "vitest";
import type { NodoDeSubarbol } from "../application/puertos";
import { cuentasDeLugar } from "./contenido";
import {
  cabecera,
  calleDeLaCabecera,
  calleDeLaColonia,
  calleDeLaOtraColonia,
  colonia,
  coloniaId,
  nodoDomicilio,
  nodos,
  otraColoniaId,
} from "./contenidoDePrueba";

describe("cuentasDeLugar", () => {
  /** Antes contaba solo las directas: un asentamiento con todo en sus
   *  colonias reportaba cero, que es el modo de falla que esta rebanada
   *  corrige. */
  it("cuenta los domicilios de todo el subarbol, no solo los directos", () => {
    const cuentas = cuentasDeLugar({ nodos, calles: [], nodo: cabecera });

    expect(cuentas.domicilios).toBe(3);
  });

  it("una cabecera con todas sus direcciones en las colonias las cuenta", () => {
    const soloLaOtraColonia = nodos.filter(
      (nodo) => nodo.clase !== "domicilio" || nodo.lugarId === otraColoniaId,
    );

    const cuentas = cuentasDeLugar({
      nodos: soloLaOtraColonia,
      calles: [],
      nodo: cabecera,
    });

    expect(cuentas.domicilios).toBe(1);
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

  /**
   * `descendientesDe` ya prueba que un ciclo de `padreId` no la cuelga,
   * pero esto prueba el sitio que la compone: el set semilla con `nodo.id`
   * y el estrechamiento por clase antes de caminar. La primitiva probada y
   * la composicion probada no son lo mismo (hallazgo R3-001 de
   * `review-19668e85448cf618`).
   */
  it("un ciclo de padreId no cuelga el conteo del nodo", () => {
    const enCiclo: readonly NodoDeSubarbol[] = [
      {
        clase: "lugar",
        id: coloniaId,
        tipo: "colonia",
        nombre: "Centro",
        padreId: otraColoniaId,
      },
      {
        clase: "lugar",
        id: otraColoniaId,
        tipo: "colonia",
        nombre: "Norte",
        padreId: coloniaId,
      },
      nodoDomicilio("99999999-9999-4999-8999-999999999999", otraColoniaId),
    ];

    const cuentas = cuentasDeLugar({
      nodos: enCiclo,
      calles: [],
      nodo: colonia,
    });

    expect(cuentas.domicilios).toBe(1);
  });
});
