import { describe, expect, it } from "vitest";
import {
  construirHrefDeListado,
  hrefDeVerMas,
  hrefSinBusqueda,
  hrefSinEstado,
} from "./hrefsDeListado";

describe("construirHrefDeListado", () => {
  it("sin parametros, la ruta queda limpia", () => {
    expect(construirHrefDeListado({})).toBe("/constancias");
  });

  it("agrega el filtro de estado", () => {
    expect(construirHrefDeListado({ filtros: { estado: "VIGENTE" } })).toBe(
      "/constancias?estado=VIGENTE",
    );
  });

  it("agrega la busqueda", () => {
    expect(construirHrefDeListado({ q: "Poot" })).toBe("/constancias?q=Poot");
  });

  it("agrega orden y direccion juntos", () => {
    expect(
      construirHrefDeListado({
        orden: { campo: "folio", direccion: "asc" },
      }),
    ).toBe("/constancias?ordenar=folio&direccion=asc");
  });

  it("omite el limite cuando es el default", () => {
    expect(construirHrefDeListado({ limite: 50 })).toBe("/constancias");
  });

  it("incluye el limite cuando no es el default", () => {
    expect(construirHrefDeListado({ limite: 100 })).toBe(
      "/constancias?limite=100",
    );
  });

  it("combina filtro, busqueda y orden en un solo query", () => {
    expect(
      construirHrefDeListado({
        filtros: { estado: "CANCELADA" },
        q: "Poot",
        orden: { campo: "emitida", direccion: "desc" },
      }),
    ).toBe(
      "/constancias?estado=CANCELADA&q=Poot&ordenar=emitida&direccion=desc",
    );
  });
});

describe("hrefDeVerMas", () => {
  it("sin limite previo, suma un tamano de pagina al default", () => {
    expect(hrefDeVerMas({})).toBe("/constancias?limite=100");
  });

  it("con limite previo, lo suma y nunca resta", () => {
    expect(hrefDeVerMas({ limite: 100 })).toBe("/constancias?limite=150");
  });

  it("conserva filtros, busqueda y orden", () => {
    expect(
      hrefDeVerMas({
        filtros: { estado: "VIGENTE" },
        q: "Poot",
        orden: { campo: "folio", direccion: "asc" },
      }),
    ).toBe(
      "/constancias?estado=VIGENTE&q=Poot&ordenar=folio&direccion=asc&limite=100",
    );
  });
});

describe("hrefSinEstado", () => {
  it("quita el filtro y conserva la busqueda", () => {
    expect(hrefSinEstado({ q: "Poot" })).toBe("/constancias?q=Poot");
  });

  it("sin busqueda, vuelve a la ruta limpia", () => {
    expect(hrefSinEstado({})).toBe("/constancias");
  });

  it("conserva el orden pedido", () => {
    expect(hrefSinEstado({ orden: { campo: "folio", direccion: "asc" } })).toBe(
      "/constancias?ordenar=folio&direccion=asc",
    );
  });
});

describe("hrefSinBusqueda", () => {
  it("quita la busqueda y conserva el filtro de estado", () => {
    expect(
      hrefSinBusqueda({ filtros: { estado: "CANCELADA" }, q: "Poot" }),
    ).toBe("/constancias?estado=CANCELADA");
  });

  it("sin filtros, vuelve a la ruta limpia", () => {
    expect(hrefSinBusqueda({ q: "Poot" })).toBe("/constancias");
  });

  it("conserva el orden pedido", () => {
    expect(
      hrefSinBusqueda({
        filtros: { estado: "VIGENTE" },
        q: "Poot",
        orden: { campo: "emitida", direccion: "desc" },
      }),
    ).toBe("/constancias?estado=VIGENTE&ordenar=emitida&direccion=desc");
  });
});
