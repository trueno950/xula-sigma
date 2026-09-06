import { describe, expect, it } from "vitest";
import { TAMANO_DE_PAGINA } from "../application/listarReportes";
import {
  construirHrefDeListado,
  hrefDeVerMas,
  hrefSinFiltro,
} from "./hrefsDeListado";

describe("construirHrefDeListado", () => {
  it("sin parametros, la ruta pelada", () => {
    expect(construirHrefDeListado({})).toBe("/reportes");
  });

  it("preserva estado y tipo", () => {
    expect(
      construirHrefDeListado({
        filtros: { estado: "RECIBIDO", tipo: "BACHE" },
      }),
    ).toBe("/reportes?estado=RECIBIDO&tipo=BACHE");
  });

  it("preserva la busqueda de texto", () => {
    expect(construirHrefDeListado({ q: "bache" })).toBe("/reportes?q=bache");
  });

  it("agrega ordenar y direccion cuando hay orden", () => {
    expect(
      construirHrefDeListado({
        orden: { campo: "folio", direccion: "desc" },
      }),
    ).toBe("/reportes?ordenar=folio&direccion=desc");
  });

  it("omite limite cuando es el tamano de pagina por defecto", () => {
    expect(construirHrefDeListado({ limite: TAMANO_DE_PAGINA })).toBe(
      "/reportes",
    );
  });

  it("incluye limite cuando difiere del default y combina todo", () => {
    expect(
      construirHrefDeListado({
        filtros: { estado: "RECIBIDO" },
        q: "bache",
        orden: { campo: "registrado", direccion: "asc" },
        limite: TAMANO_DE_PAGINA * 2,
      }),
    ).toBe(
      `/reportes?estado=RECIBIDO&q=bache&ordenar=registrado&direccion=asc&limite=${TAMANO_DE_PAGINA * 2}`,
    );
  });
});

describe("hrefDeVerMas", () => {
  it("suma un tamano de pagina al limite actual (implicito, 50 -> 100)", () => {
    expect(hrefDeVerMas({})).toBe(`/reportes?limite=${TAMANO_DE_PAGINA * 2}`);
  });

  it("preserva filtros, busqueda y orden", () => {
    expect(
      hrefDeVerMas({
        filtros: { tipo: "BACHE" },
        q: "bache",
        orden: { campo: "folio", direccion: "desc" },
      }),
    ).toBe(
      `/reportes?tipo=BACHE&q=bache&ordenar=folio&direccion=desc&limite=${TAMANO_DE_PAGINA * 2}`,
    );
  });
});

describe("hrefSinFiltro", () => {
  it("quita solo el campo pedido y conserva el otro filtro", () => {
    expect(
      hrefSinFiltro(
        { filtros: { estado: "RECIBIDO", tipo: "BACHE" } },
        "estado",
      ),
    ).toBe("/reportes?tipo=BACHE");
  });

  it("conserva la busqueda de texto", () => {
    expect(
      hrefSinFiltro({ filtros: { tipo: "BACHE" }, q: "bache" }, "tipo"),
    ).toBe("/reportes?q=bache");
  });

  it("suelta orden y limite: vuelve a la primera pagina en el orden por defecto", () => {
    expect(
      hrefSinFiltro(
        {
          filtros: { estado: "RECIBIDO" },
          orden: { campo: "folio", direccion: "desc" },
          limite: TAMANO_DE_PAGINA * 2,
        },
        "estado",
      ),
    ).toBe("/reportes");
  });
});
