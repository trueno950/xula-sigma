import { describe, expect, it } from "vitest";
import {
  type Agrupacion,
  agruparEnCalles,
  type PuntoDeMapa,
  predominante,
} from "../domain";

type HechoFalso = { id: string; calleId: string | null };

const CALLE_A = "calle-a";
const CALLE_B = "calle-b";
const CALLE_SIN_PUNTO = "calle-sin-punto";

const PUNTOS: Readonly<Record<string, PuntoDeMapa>> = {
  [CALLE_A]: { latitud: 21.02, longitud: -89.6 },
  [CALLE_B]: { latitud: 20.9, longitud: -89.5 },
};

const puntoDeCalle = (calleId: string): PuntoDeMapa | null =>
  PUNTOS[calleId] ?? null;

const agrupar = (hechos: readonly HechoFalso[]): Agrupacion<HechoFalso> =>
  agruparEnCalles(hechos, puntoDeCalle);

const idsDe = (hechos: readonly HechoFalso[]) =>
  hechos.map((hecho) => hecho.id);

describe("agruparEnCalles", () => {
  it("dos hechos de la misma calle comparten un marcador", () => {
    const { grupos } = agrupar([
      { id: "reporte", calleId: CALLE_A },
      { id: "intervencion", calleId: CALLE_A },
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0]?.calleId).toBe(CALLE_A);
    expect(grupos[0]?.punto).toEqual(PUNTOS[CALLE_A]);
    expect(idsDe(grupos[0]?.hechos ?? [])).toEqual(["reporte", "intervencion"]);
  });

  it("calles distintas quedan en marcadores distintos, en el orden de entrada", () => {
    const { grupos } = agrupar([
      { id: "en-b", calleId: CALLE_B },
      { id: "en-a", calleId: CALLE_A },
      { id: "otra-vez-b", calleId: CALLE_B },
    ]);

    expect(grupos.map((grupo) => grupo.calleId)).toEqual([CALLE_B, CALLE_A]);
    expect(idsDe(grupos[0]?.hechos ?? [])).toEqual(["en-b", "otra-vez-b"]);
  });

  it("un hecho sin calle no inventa punto: va a los que no se pueden ubicar", () => {
    const { grupos, sinPunto } = agrupar([
      { id: "sin-calle", calleId: null },
      { id: "con-calle", calleId: CALLE_A },
    ]);

    expect(idsDe(sinPunto)).toEqual(["sin-calle"]);
    expect(grupos).toHaveLength(1);
  });

  it("una calle sin punto tampoco ubica su hecho", () => {
    const { grupos, sinPunto } = agrupar([
      { id: "sin-punto", calleId: CALLE_SIN_PUNTO },
    ]);

    expect(grupos).toEqual([]);
    expect(idsDe(sinPunto)).toEqual(["sin-punto"]);
  });

  it("sin hechos no hay grupos ni faltantes", () => {
    expect(agrupar([])).toEqual({ grupos: [], sinPunto: [] });
  });
});

describe("predominante", () => {
  it("gana el valor que mas se repite", () => {
    expect(predominante(["a", "b", "b"])).toBe("b");
  });

  it("un empate se queda con el primero que aparecio", () => {
    expect(predominante(["a", "b", "b", "a"])).toBe("a");
  });

  it("sin valores no hay predominante", () => {
    expect(predominante([])).toBeUndefined();
  });
});
