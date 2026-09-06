import { describe, expect, it } from "vitest";
import { leerParametros } from "./parametros";

describe("leerParametros", () => {
  /**
   * El caso que corrigio GGA en `reportes/parametros.ts`, replicado aca:
   * `FiltrosDeConstancias` manda q/estado en un solo form. Buscador vacio ->
   * q="" en el GET. Con un `.safeParse()` de todo el objeto, esa ""
   * invalidaba tambien `estado`.
   */
  it("una q vacia no descarta el filtro de estado", () => {
    const parametros = leerParametros({ q: "", estado: "VIGENTE" });

    expect(parametros.filtros.estado).toBe("VIGENTE");
    expect(parametros.q).toBeUndefined();
  });

  it("un estado vacio (opcion Todos) no descarta la busqueda de texto", () => {
    const parametros = leerParametros({ estado: "", q: "Poot" });

    expect(parametros.filtros.estado).toBeUndefined();
    expect(parametros.q).toBe("Poot");
  });

  it("estado=a&estado=b (string[]) cae a undefined sin romper q", () => {
    const parametros = leerParametros({ estado: ["a", "b"], q: "Poot" });

    expect(parametros.filtros.estado).toBeUndefined();
    expect(parametros.q).toBe("Poot");
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
