import { describe, expect, it } from "vitest";
import { reglas, revisar } from "./index";

describe("el catalogo de reglas", () => {
  it("no repite identificadores", () => {
    const ids = reglas.map((regla) => regla.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cada regla apunta a su antipatron de AGENTS.md", () => {
    for (const regla of reglas) {
      expect(regla.antipatron).toBeGreaterThan(0);
    }
  });

  /**
   * El numero esta escrito en tres lugares —ADR 0001 seccion 7, CLAUDE.md y
   * `docs/04-calidad.md` seccion 4— y la revision del PR que introdujo estas
   * reglas encontro que uno de los tres decia nueve. Este test es el que
   * hace fallar el build cuando vuelvan a divergir.
   */
  it("son ocho, el numero que dice la documentacion", () => {
    expect(reglas).toHaveLength(8);
  });

  it("no encuentra nada en un repositorio vacio", () => {
    expect(revisar([])).toEqual([]);
  });
});
