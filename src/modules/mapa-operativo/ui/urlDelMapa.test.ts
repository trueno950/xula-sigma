import { describe, expect, it } from "vitest";
import { hrefDelMapa, RUTA_DEL_MAPA } from "./urlDelMapa";

/**
 * S1 y S4: los chips, las pestanas y el vacio por filtro son la misma URL.
 * Estos tests fijan que quitar un filtro conserva los otros y que la pestana
 * elegida queda escrita, que es lo que hace que el panel funcione sin
 * JavaScript.
 */
describe("hrefDelMapa", () => {
  it("sin filtros ni pestana es la ruta pelada", () => {
    expect(hrefDelMapa({})).toBe(RUTA_DEL_MAPA);
  });

  it("quitar el tipo conserva el estado y el territorio", () => {
    expect(
      hrefDelMapa({ tipo: undefined, estado: "RECIBIDO", lugar: "raiz-1" }),
    ).toBe(`${RUTA_DEL_MAPA}?lugar=raiz-1&estado=RECIBIDO`);
  });

  it("escribe la pestana elegida despues de los filtros", () => {
    expect(hrefDelMapa({ tipo: "BACHE" }, "sin-ubicar")).toBe(
      `${RUTA_DEL_MAPA}?tipo=BACHE&panel=sin-ubicar`,
    );
  });

  it("escapa los valores que vienen de la URL", () => {
    expect(hrefDelMapa({ area: "AGUA POTABLE" })).toBe(
      `${RUTA_DEL_MAPA}?area=AGUA+POTABLE`,
    );
  });
});
