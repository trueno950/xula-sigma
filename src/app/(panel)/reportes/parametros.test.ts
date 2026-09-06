import { describe, expect, it } from "vitest";
import { leerParametros } from "./parametros";

describe("leerParametros", () => {
  /**
   * El caso que reporto GGA: FiltrosDeReportes manda q/estado/tipo en un
   * solo form. Buscador vacio -> q="" en el GET. Con un `.safeParse()` de
   * todo el objeto, esa "" invalidaba tambien `estado`.
   */
  it("una q vacia no descarta el filtro de estado", () => {
    const parametros = leerParametros({ q: "", estado: "RECIBIDO" });

    expect(parametros.filtros.estado).toBe("RECIBIDO");
    expect(parametros.q).toBeUndefined();
  });

  it("un estado vacio (opcion Todos) no descarta la busqueda de texto", () => {
    const parametros = leerParametros({ estado: "", q: "bache" });

    expect(parametros.filtros.estado).toBeUndefined();
    expect(parametros.q).toBe("bache");
  });

  it("un tipo vacio no descarta estado ni q", () => {
    const parametros = leerParametros({
      tipo: "",
      estado: "RECIBIDO",
      q: "bache",
    });

    expect(parametros.filtros.tipo).toBeUndefined();
    expect(parametros.filtros.estado).toBe("RECIBIDO");
    expect(parametros.q).toBe("bache");
  });

  it("estado=a&estado=b (string[]) cae a undefined sin romper q", () => {
    const parametros = leerParametros({ estado: ["a", "b"], q: "bache" });

    expect(parametros.filtros.estado).toBeUndefined();
    expect(parametros.q).toBe("bache");
  });

  it("ordenar valido arma el orden con direccion por defecto asc", () => {
    const parametros = leerParametros({ ordenar: "folio" });

    expect(parametros.orden).toEqual({ campo: "folio", direccion: "asc" });
  });

  it("sin ordenar no hay orden, aunque venga direccion", () => {
    const parametros = leerParametros({ direccion: "desc" });

    expect(parametros.orden).toBeUndefined();
  });

  it("sin parametros, todo cae a sus defaults", () => {
    const parametros = leerParametros({});

    expect(parametros).toEqual({
      filtros: {},
      q: undefined,
      limite: undefined,
      orden: undefined,
      error: undefined,
    });
  });
});
