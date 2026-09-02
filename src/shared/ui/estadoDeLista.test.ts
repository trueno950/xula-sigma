import { describe, expect, it } from "vitest";
import { estadoDeLista } from "./estadoDeLista";

/**
 * DESIGN.md, Estados de lista: el vacio inicial y el vacio por filtro son
 * mensajes distintos porque son problemas distintos. Confundirlos manda al
 * operador a crear un registro que ya existe — que es exactamente lo que
 * `/padron?q=xyz` hacia antes de esta funcion: sin resultados de busqueda
 * respondia "Todavia no hay personas en el padron".
 */
describe("estadoDeLista", () => {
  it("con filas es con filas, haya filtro o no", () => {
    expect(estadoDeLista({ total: 3 })).toEqual({ clase: "con-filas" });
    expect(estadoDeLista({ total: 3, filtro: "kumul" })).toEqual({
      clase: "con-filas",
    });
  });

  it("sin filas y sin filtro es el vacio inicial", () => {
    expect(estadoDeLista({ total: 0 })).toEqual({ clase: "vacio-inicial" });
  });

  it("sin filas y con filtro nombra el filtro que lo dejo vacio", () => {
    expect(estadoDeLista({ total: 0, filtro: "kumul" })).toEqual({
      clase: "vacio-por-filtro",
      filtro: "kumul",
    });
  });

  it("recorta el filtro y trata el de solo espacios como ausente", () => {
    // `?q=%20%20` llega como filtro presente pero no filtro nada: decir
    // "sin resultados para '  '" seria mentirle al operador.
    expect(estadoDeLista({ total: 0, filtro: "   " })).toEqual({
      clase: "vacio-inicial",
    });
    expect(estadoDeLista({ total: 0, filtro: "  kumul  " })).toEqual({
      clase: "vacio-por-filtro",
      filtro: "kumul",
    });
  });
});
