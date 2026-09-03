import { describe, expect, it } from "vitest";
import { destinoDeReparenteo, ofertaDeReparenteo } from "./reparenteo";

describe("ofertaDeReparenteo", () => {
  it("con destinos muestra el select", () => {
    const oferta = ofertaDeReparenteo({
      destinos: 3,
      puedeSerRaiz: false,
      tienePadre: true,
    });

    expect(oferta.muestraDestinos).toBe(true);
    expect(oferta.muestraDesanclar).toBe(false);
  });

  /**
   * El caso que faltaba: una cabecera heredada que cuelga de alguien. Sin
   * esto no habia forma de repararla desde la pantalla.
   */
  it("una raiz que cuelga de alguien puede soltarse", () => {
    const oferta = ofertaDeReparenteo({
      destinos: 0,
      puedeSerRaiz: true,
      tienePadre: true,
    });

    expect(oferta.muestraDesanclar).toBe(true);
  });

  it("una raiz sana no ofrece soltarse: ya no cuelga de nada", () => {
    const oferta = ofertaDeReparenteo({
      destinos: 0,
      puedeSerRaiz: true,
      tienePadre: false,
    });

    expect(oferta.muestraDestinos).toBe(false);
    expect(oferta.muestraDesanclar).toBe(false);
  });

  it("un tipo sin destinos y que no puede ser raiz no ofrece nada", () => {
    const oferta = ofertaDeReparenteo({
      destinos: 0,
      puedeSerRaiz: false,
      tienePadre: true,
    });

    expect(oferta.muestraDestinos).toBe(false);
    expect(oferta.muestraDesanclar).toBe(false);
  });
});

describe("destinoDeReparenteo", () => {
  const lugarId = "11111111-1111-4111-8111-111111111111";
  const nuevoPadreId = "22222222-2222-4222-8222-222222222222";

  it("abre el nodo bajo su nuevo padre", () => {
    expect(destinoDeReparenteo({ lugarId, nuevoPadreId })).toEqual({
      raiz: nuevoPadreId,
      nodo: lugarId,
    });
  });

  it("desanclado, el nodo es su propia raiz", () => {
    expect(destinoDeReparenteo({ lugarId, nuevoPadreId: "" })).toEqual({
      raiz: lugarId,
      nodo: lugarId,
    });
  });

  it("nunca devuelve la raiz de la que se venia", () => {
    const raizAnterior = "33333333-3333-4333-8333-333333333333";
    const destino = destinoDeReparenteo({ lugarId, nuevoPadreId });

    expect(destino.raiz).not.toBe(raizAnterior);
  });
});
