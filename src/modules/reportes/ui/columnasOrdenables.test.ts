import { describe, expect, it } from "vitest";
import type { ColumnaDeTabla } from "@/shared/ui";
import { resolverOrdenDeColumnas } from "./columnasOrdenables";

const columnasBase: readonly ColumnaDeTabla[] = [
  { clave: "folio", etiqueta: "Folio", ancho: "minmax(0,2fr)" },
  { clave: "tipo", etiqueta: "Tipo", ancho: "minmax(0,1fr)" },
  { clave: "estado", etiqueta: "Estado", ancho: "minmax(0,1fr)" },
  { clave: "area", etiqueta: "Area", ancho: "minmax(0,1fr)" },
  { clave: "registrado", etiqueta: "Registrado", ancho: "minmax(0,1fr)" },
];

describe("resolverOrdenDeColumnas", () => {
  it("sin orden pedido, folio queda clicable y sin marca activa", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {});

    expect(columnas[0]).toEqual({
      clave: "folio",
      etiqueta: "Folio",
      ancho: "minmax(0,2fr)",
      orden: {
        href: "/reportes?ordenar=folio&direccion=asc",
        activa: false,
      },
    });
  });

  it("registrado tambien es clicable", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {});

    expect(columnas[4]?.orden).toEqual({
      href: "/reportes?ordenar=registrado&direccion=asc",
      activa: false,
    });
  });

  it("tipo, estado y area no son clicables: no admiten orden natural", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {});

    expect(columnas[1]).toEqual({
      clave: "tipo",
      etiqueta: "Tipo",
      ancho: "minmax(0,1fr)",
    });
    expect(columnas[2]).toEqual({
      clave: "estado",
      etiqueta: "Estado",
      ancho: "minmax(0,1fr)",
    });
    expect(columnas[3]).toEqual({
      clave: "area",
      etiqueta: "Area",
      ancho: "minmax(0,1fr)",
    });
  });

  it("con folio/asc activo, marca asc y el link apunta a desc", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {
      orden: { campo: "folio", direccion: "asc" },
    });

    expect(columnas[0]?.orden).toEqual({
      href: "/reportes?ordenar=folio&direccion=desc",
      activa: "asc",
    });
  });

  it("con registrado/desc activo, marca desc y el link vuelve a asc", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {
      orden: { campo: "registrado", direccion: "desc" },
    });

    expect(columnas[4]?.orden).toEqual({
      href: "/reportes?ordenar=registrado&direccion=asc",
      activa: "desc",
    });
  });

  it("preserva filtros y busqueda en el link de orden", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {
      filtros: { estado: "RECIBIDO" },
      q: "bache",
    });

    expect(columnas[0]?.orden?.href).toBe(
      "/reportes?estado=RECIBIDO&q=bache&ordenar=folio&direccion=asc",
    );
  });
});
