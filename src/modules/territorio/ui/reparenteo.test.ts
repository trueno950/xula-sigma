import { describe, expect, it } from "vitest";
import { ofertaDeReparenteo } from "./reparenteo";

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
