import { describe, expect, it } from "vitest";
import { masAdentroDe } from "./conteo";

describe("masAdentroDe", () => {
  const arbol = [
    { id: "raiz", padreId: null },
    { id: "hijo", padreId: "raiz" },
    { id: "nieto", padreId: "hijo" },
    { id: "bisnieto", padreId: "nieto" },
  ];

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
