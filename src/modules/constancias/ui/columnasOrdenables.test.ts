import { describe, expect, it } from "vitest";
import type { ColumnaDeTabla } from "@/shared/ui";
import { resolverOrdenDeColumnas } from "./columnasOrdenables";

const columnasBase: readonly ColumnaDeTabla[] = [
  { clave: "folio", etiqueta: "Folio", ancho: "minmax(0,2fr)" },
  { clave: "emitida", etiqueta: "Emitida", ancho: "minmax(0,1fr)" },
];

describe("resolverOrdenDeColumnas", () => {
  it("sin orden pedido, folio queda clicable y sin marca activa", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {});

    expect(columnas[0]).toEqual({
      clave: "folio",
      etiqueta: "Folio",
      ancho: "minmax(0,2fr)",
      orden: {
        href: "/constancias?ordenar=folio&direccion=asc",
        activa: false,
      },
    });
  });

  it("emitida tambien es clicable", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {});

    expect(columnas[1]?.orden).toEqual({
      href: "/constancias?ordenar=emitida&direccion=asc",
      activa: false,
    });
  });

  it("con folio/asc activo, marca asc y el link apunta a desc", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {
      orden: { campo: "folio", direccion: "asc" },
    });

    expect(columnas[0]?.orden).toEqual({
      href: "/constancias?ordenar=folio&direccion=desc",
      activa: "asc",
    });
  });

  it("con emitida/desc activo, marca desc y el link vuelve a asc", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {
      orden: { campo: "emitida", direccion: "desc" },
    });

    expect(columnas[1]?.orden).toEqual({
      href: "/constancias?ordenar=emitida&direccion=asc",
      activa: "desc",
    });
  });

  it("preserva filtros y busqueda en el link de orden", () => {
    const columnas = resolverOrdenDeColumnas(columnasBase, {
      filtros: { estado: "VIGENTE" },
      q: "Poot",
    });

    expect(columnas[0]?.orden?.href).toBe(
      "/constancias?estado=VIGENTE&q=Poot&ordenar=folio&direccion=asc",
    );
  });
});
