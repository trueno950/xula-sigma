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
   * El numero vive en la documentacion —ADR 0001 seccion 7, CLAUDE.md y
   * `docs/04-calidad.md` seccion 4— y la revision del PR que introdujo estas
   * reglas encontro que uno decia nueve. Este test es el que hace fallar el
   * build cuando vuelvan a divergir.
   *
   * No lleva la cuenta de en cuantos lugares esta, a proposito: la version
   * anterior decia "tres" y quedo vieja en la misma revision que la escribio,
   * porque un comentario de `main.ts` era un cuarto. Un comentario que cuenta
   * es un comentario que envejece — el filtro 1 de la regla de comentarios.
   */
  it("son ocho, el numero que dice la documentacion", () => {
    expect(reglas).toHaveLength(8);
  });

  it("no encuentra nada en un repositorio vacio", () => {
    expect(revisar([])).toEqual([]);
  });
});
