import { describe, expect, it } from "vitest";
import {
  type CajaDeMapa,
  cajaDePuntos,
  MARGEN_DE_CAJA_EN_GRADOS,
  type PuntoDeMapa,
} from "../domain";

const contiene = (caja: CajaDeMapa, punto: PuntoDeMapa) =>
  caja.sur <= punto.latitud &&
  punto.latitud <= caja.norte &&
  caja.oeste <= punto.longitud &&
  punto.longitud <= caja.este;

const ancho = (caja: CajaDeMapa) => caja.este - caja.oeste;
const alto = (caja: CajaDeMapa) => caja.norte - caja.sur;

describe("cajaDePuntos", () => {
  it("sin calles ubicadas no hay caja: nunca inventa un centro", () => {
    expect(cajaDePuntos([])).toBeNull();
  });

  it("una sola calle abre el margen minimo alrededor de su punto", () => {
    const punto = { latitud: 21.283, longitud: -89.667 };

    const caja = cajaDePuntos([punto]);

    expect(caja).not.toBeNull();
    if (!caja) return;
    expect(caja.sur).toBeCloseTo(punto.latitud - MARGEN_DE_CAJA_EN_GRADOS, 9);
    expect(caja.norte).toBeCloseTo(punto.latitud + MARGEN_DE_CAJA_EN_GRADOS, 9);
    expect(caja.oeste).toBeCloseTo(
      punto.longitud - MARGEN_DE_CAJA_EN_GRADOS,
      9,
    );
    expect(caja.este).toBeCloseTo(punto.longitud + MARGEN_DE_CAJA_EN_GRADOS, 9);
    expect(contiene(caja, punto)).toBe(true);
  });

  it("varias calles quedan todas adentro, en orden sur/oeste/norte/este", () => {
    const puntos = [
      { latitud: 20.9674, longitud: -89.5926 },
      { latitud: 21.283, longitud: -89.667 },
      { latitud: 21.1, longitud: -89.5 },
    ];

    const caja = cajaDePuntos(puntos);

    expect(caja).not.toBeNull();
    if (!caja) return;
    for (const punto of puntos) expect(contiene(caja, punto)).toBe(true);
    expect(caja.sur).toBeLessThan(caja.norte);
    expect(caja.oeste).toBeLessThan(caja.este);
  });

  it("crece con un margen proporcional a lo que separa a las calles", () => {
    const cerca = cajaDePuntos([
      { latitud: 20.9, longitud: -89.6 },
      { latitud: 20.91, longitud: -89.59 },
    ]);
    const lejos = cajaDePuntos([
      { latitud: 20.9, longitud: -89.6 },
      { latitud: 21.0, longitud: -89.5 },
    ]);

    expect(cerca).not.toBeNull();
    expect(lejos).not.toBeNull();
    if (!cerca || !lejos) return;
    expect(alto(lejos)).toBeGreaterThan(alto(cerca));
    expect(ancho(lejos)).toBeGreaterThan(ancho(cerca));
    // El minimo manda cuando el territorio cabe en el: dos calles pegadas no
    // colapsan la caja a un punto.
    expect(alto(cerca)).toBeCloseTo(MARGEN_DE_CAJA_EN_GRADOS * 2 + 0.01, 9);
  });

  it("dos calles en el mismo punto no colapsan la caja", () => {
    const punto = { latitud: 20.9674, longitud: -89.5926 };

    const caja = cajaDePuntos([punto, punto]);

    expect(caja).not.toBeNull();
    if (!caja) return;
    expect(alto(caja)).toBeCloseTo(MARGEN_DE_CAJA_EN_GRADOS * 2, 9);
    expect(ancho(caja)).toBeCloseTo(MARGEN_DE_CAJA_EN_GRADOS * 2, 9);
  });
});
