import { describe, expect, it } from "vitest";
import { descendientesDe, masAdentroDe } from "./conteo";

const arbol = [
  { id: "raiz", padreId: null },
  { id: "hijo", padreId: "raiz" },
  { id: "nieto", padreId: "hijo" },
  { id: "bisnieto", padreId: "nieto" },
];

describe("masAdentroDe", () => {
  it("cuenta todos los niveles, no solo el primero", () => {
    expect(masAdentroDe(["hijo"], arbol)).toBe(2);
  });

  it("sin nada debajo devuelve cero", () => {
    expect(masAdentroDe(["bisnieto"], arbol)).toBe(0);
  });

  it("no cuenta dos veces lo que cuelga de dos ids dados", () => {
    expect(masAdentroDe(["hijo", "nieto"], arbol)).toBe(1);
  });

  it("un ciclo en `padreId` no cuelga el conteo", () => {
    const enCiclo = [
      { id: "a", padreId: "b" },
      { id: "b", padreId: "a" },
    ];

    expect(masAdentroDe(["a"], enCiclo)).toBe(1);
  });
});

describe("descendientesDe", () => {
  it("devuelve todos los niveles, no solo el primero", () => {
    expect(descendientesDe(["hijo"], arbol)).toEqual(["nieto", "bisnieto"]);
  });

  it("no incluye los ids de partida entre los descendientes", () => {
    expect(descendientesDe(["hijo"], arbol)).not.toContain("hijo");
  });

  it("no repite un id alcanzado ni uno que ya venia dado", () => {
    expect(descendientesDe(["hijo", "nieto"], arbol)).toEqual(["bisnieto"]);
  });

  it("un ciclo en `padreId` no cuelga el recorrido", () => {
    const enCiclo = [
      { id: "a", padreId: "b" },
      { id: "b", padreId: "a" },
    ];

    expect(descendientesDe(["a"], enCiclo)).toEqual(["b"]);
  });
});
