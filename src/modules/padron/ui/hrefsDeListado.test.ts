import { describe, expect, it } from "vitest";
import { TAMANO_DE_PAGINA } from "../application/listarPersonas";
import { construirHrefDeListado, hrefDeVerMas } from "./hrefsDeListado";

describe("construirHrefDeListado", () => {
  it("sin parametros, la ruta pelada", () => {
    expect(construirHrefDeListado({})).toBe("/padron");
  });

  it("preserva el filtro de busqueda", () => {
    expect(construirHrefDeListado({ filtro: "juan" })).toBe("/padron?q=juan");
  });

  it("agrega ordenar y direccion cuando hay orden", () => {
    expect(
      construirHrefDeListado({
        orden: { campo: "persona", direccion: "desc" },
      }),
    ).toBe("/padron?ordenar=persona&direccion=desc");
  });

  it("omite limite cuando es el tamano de pagina por defecto", () => {
    expect(construirHrefDeListado({ limite: TAMANO_DE_PAGINA })).toBe(
      "/padron",
    );
  });

  it("incluye limite cuando difiere del default, y combina los tres", () => {
    expect(
      construirHrefDeListado({
        filtro: "juan",
        orden: { campo: "persona", direccion: "asc" },
        limite: TAMANO_DE_PAGINA * 2,
      }),
    ).toBe(
      `/padron?q=juan&ordenar=persona&direccion=asc&limite=${TAMANO_DE_PAGINA * 2}`,
    );
  });
});

describe("hrefDeVerMas", () => {
  it("suma un tamano de pagina al limite actual (implicito, 50 -> 100)", () => {
    expect(hrefDeVerMas({})).toBe(`/padron?limite=${TAMANO_DE_PAGINA * 2}`);
  });

  it("suma sobre el limite explicito", () => {
    expect(hrefDeVerMas({ limite: TAMANO_DE_PAGINA * 2 })).toBe(
      `/padron?limite=${TAMANO_DE_PAGINA * 3}`,
    );
  });

  it("preserva filtro y orden", () => {
    expect(
      hrefDeVerMas({
        filtro: "juan",
        orden: { campo: "persona", direccion: "desc" },
      }),
    ).toBe(
      `/padron?q=juan&ordenar=persona&direccion=desc&limite=${TAMANO_DE_PAGINA * 2}`,
    );
  });
});
