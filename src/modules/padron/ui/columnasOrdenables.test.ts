import { describe, expect, it } from "vitest";
import type { ColumnaDeTabla } from "@/shared/ui";
import { resolverOrdenDeColumnas } from "./columnasOrdenables";

const columnasBase: readonly ColumnaDeTabla[] = [
  { clave: "persona", etiqueta: "Persona", ancho: "minmax(0,2fr)" },
  { clave: "curp", etiqueta: "CURP", ancho: "minmax(0,1fr)" },
];

describe("resolverOrdenDeColumnas", () => {
  it("sin orden pedido, persona queda clicable y sin marca activa", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {});

    expect(columnas[0]).toEqual({
      clave: "persona",
      etiqueta: "Persona",
      ancho: "minmax(0,2fr)",
      orden: { href: "/padron?ordenar=persona&direccion=asc", activa: false },
    });
  });

  it("curp no es clicable: no admite orden natural", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {});

    expect(columnas[1]).toEqual({
      clave: "curp",
      etiqueta: "CURP",
      ancho: "minmax(0,1fr)",
    });
  });

  it("con persona/asc activo, marca asc y el link apunta a desc", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {
      orden: { campo: "persona", direccion: "asc" },
    });

    expect(columnas[0]?.orden).toEqual({
      href: "/padron?ordenar=persona&direccion=desc",
      activa: "asc",
    });
  });

  it("con persona/desc activo, marca desc y el link vuelve a asc", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {
      orden: { campo: "persona", direccion: "desc" },
    });

    expect(columnas[0]?.orden).toEqual({
      href: "/padron?ordenar=persona&direccion=asc",
      activa: "desc",
    });
  });

  it("preserva el filtro de busqueda en el link de orden", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, { filtro: "juan" });

    expect(columnas[0]?.orden?.href).toBe(
      "/padron?q=juan&ordenar=persona&direccion=asc",
    );
  });
});
