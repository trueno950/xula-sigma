import { describe, expect, it } from "vitest";
import { resolverPagina } from "./paginacion";

describe("resolverPagina", () => {
  it("cuando el repositorio trae una fila de mas, la recorta y marca hayMas", () => {
    const filas = [1, 2, 3];

    const pagina = resolverPagina(filas, 2);

    expect(pagina).toEqual({ filas: [1, 2], hayMas: true });
  });

  it("cuando el repositorio trae exactamente el limite, no hay mas", () => {
    const filas = [1, 2];

    const pagina = resolverPagina(filas, 2);

    expect(pagina).toEqual({ filas: [1, 2], hayMas: false });
  });

  it("cuando el repositorio trae menos que el limite, no hay mas", () => {
    const filas = [1];

    const pagina = resolverPagina(filas, 2);

    expect(pagina).toEqual({ filas: [1], hayMas: false });
  });

  it("lista vacia no tiene mas", () => {
    expect(resolverPagina([], 50)).toEqual({ filas: [], hayMas: false });
  });
});
