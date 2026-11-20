import { describe, expect, it } from "vitest";
import {
  descripcionDeFiltrosDeIntervenciones,
  filtrosSinEstado,
  leerParametros,
} from "./parametros";

const LUGAR = "22222222-2222-4222-8222-222222222222";

describe("leerParametros", () => {
  it("lee los tres filtros de la URL para el tablero", () => {
    expect(
      leerParametros({ estado: "CANCELADA", tipo: "FUGA", lugarId: LUGAR }),
    ).toEqual({
      filtros: { estado: "CANCELADA", tipo: "FUGA", lugarId: LUGAR },
      error: undefined,
    });
  });

  it("descarta el valor que no pertenece a su catalogo y conserva los otros", () => {
    expect(
      leerParametros({ estado: "INVENTADO", tipo: "FUGA" }).filtros,
    ).toEqual({ tipo: "FUGA" });
  });
});

describe("filtrosSinEstado", () => {
  it("quita el estado y conserva tipo y lugar: el estado es la estructura", () => {
    expect(
      filtrosSinEstado({ estado: "CANCELADA", tipo: "FUGA", lugarId: LUGAR }),
    ).toEqual({ tipo: "FUGA", lugarId: LUGAR });
  });
});

describe("descripcionDeFiltrosDeIntervenciones", () => {
  it("S5: nombra los filtros con sus etiquetas, nunca con el valor de enum", () => {
    const descripcion = descripcionDeFiltrosDeIntervenciones({
      estado: "CANCELADA",
      tipo: "FUGA",
      lugarId: LUGAR,
    });

    expect(descripcion).toBe('estado "Cancelada", tipo "Fuga", lugar elegido');
  });

  it("sin filtros no hay descripcion que mostrar", () => {
    expect(descripcionDeFiltrosDeIntervenciones({})).toBeUndefined();
  });
});
