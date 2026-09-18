import { describe, expect, it } from "vitest";
import type { NodoDeSubarbol } from "../application/puertos";
import { cuentasDeLugar } from "./contenido";
import {
  calleDeLaColonia,
  calleDeLaManzana,
  colonia,
  coloniaId,
  manzanaId,
  nodoDomicilio,
  nodos,
} from "./contenidoDePrueba";

describe("cuentasDeLugar", () => {
  /** Antes contaba solo las directas: una colonia con todo en las manzanas
   *  reportaba cero, que es el modo de falla que esta rebanada corrige. */
  it("cuenta los domicilios de todo el subarbol, no solo los directos", () => {
    const cuentas = cuentasDeLugar({ nodos, calles: [], nodo: colonia });

    expect(cuentas.domicilios).toBe(3);
  });

  it("una colonia con todas sus direcciones en las manzanas las cuenta", () => {
    const soloLaManzana = nodos.filter(
      (nodo) => nodo.clase !== "domicilio" || nodo.lugarId === manzanaId,
    );

    const cuentas = cuentasDeLugar({
      nodos: soloLaManzana,
      calles: [],
      nodo: colonia,
    });

    expect(cuentas.domicilios).toBe(1);
  });

  it("un nodo sin catalogo propio cuenta cero calles", () => {
    const cuentas = cuentasDeLugar({
      nodos,
      calles: [calleDeLaColonia],
      nodo: { id: manzanaId, tipo: "manzana", nombre: "Manzana 3" },
    });

    expect(cuentas.calles).toBe(0);
  });

  it("un nodo con catalogo propio cuenta solo sus calles", () => {
    const cuentas = cuentasDeLugar({
      nodos,
      calles: [calleDeLaColonia, calleDeLaManzana],
      nodo: colonia,
    });

    expect(cuentas.calles).toBe(1);
  });

  it("cuenta los lugares hijos directos", () => {
    const cuentas = cuentasDeLugar({ nodos, calles: [], nodo: colonia });

    expect(cuentas.lugares).toBe(1);
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
        padreId: manzanaId,
      },
      {
        clase: "lugar",
        id: manzanaId,
        tipo: "manzana",
        nombre: "Manzana 3",
        padreId: coloniaId,
      },
      nodoDomicilio("99999999-9999-4999-8999-999999999999", manzanaId),
    ];

    const cuentas = cuentasDeLugar({
      nodos: enCiclo,
      calles: [],
      nodo: colonia,
    });

    expect(cuentas.domicilios).toBe(1);
  });
});
