import { describe, expect, it } from "vitest";
import { colorDeEstado, construirLeyenda, type HechoContable } from "../domain";

const reporte = (tipo: string, estado: string): HechoContable => ({
  recurso: "REPORTE",
  tipo,
  estado,
});

const intervencion = (tipo: string, estado: string): HechoContable => ({
  recurso: "INTERVENCION",
  tipo,
  estado,
});

const sumaDe = (conteos: readonly { conteo: number }[]) =>
  conteos.reduce((total, entrada) => total + entrada.conteo, 0);

describe("construirLeyenda", () => {
  it("cuenta por tipo con su etiqueta y su icono", () => {
    const leyenda = construirLeyenda([
      reporte("BACHE", "RECIBIDO"),
      reporte("BACHE", "RESUELTO"),
      reporte("FUGA", "RECIBIDO"),
    ]);

    expect(leyenda.tipos).toEqual([
      {
        recurso: "REPORTE",
        tipo: "BACHE",
        etiqueta: "Bache",
        icono: "BACHE",
        conteo: 2,
      },
      {
        recurso: "REPORTE",
        tipo: "FUGA",
        etiqueta: "Fuga",
        icono: "FUGA",
        conteo: 1,
      },
    ]);
  });

  it("el mismo tipo en reporte e intervencion son dos renglones, no uno", () => {
    const leyenda = construirLeyenda([
      reporte("BACHE", "RECIBIDO"),
      intervencion("BACHE", "PLANIFICADA"),
    ]);

    expect(leyenda.tipos.map((entrada) => entrada.recurso)).toEqual([
      "REPORTE",
      "INTERVENCION",
    ]);
    expect(leyenda.tipos.map((entrada) => entrada.conteo)).toEqual([1, 1]);
  });

  it("cuenta por estado con el color que decidio el servidor", () => {
    const leyenda = construirLeyenda([
      reporte("BACHE", "RECIBIDO"),
      intervencion("OBRA", "PLANIFICADA"),
      intervencion("MEJORA", "PLANIFICADA"),
    ]);

    expect(leyenda.estados).toEqual([
      {
        estado: "RECIBIDO",
        etiqueta: "Recibido",
        color: colorDeEstado("RECIBIDO"),
        conteo: 1,
      },
      {
        estado: "PLANIFICADA",
        etiqueta: "Planificada",
        color: colorDeEstado("PLANIFICADA"),
        conteo: 2,
      },
    ]);
  });

  it("los dos conteos suman el total de hechos, sin perder ninguno", () => {
    const hechos = [
      reporte("BACHE", "RECIBIDO"),
      reporte("OTRO", "RECHAZADO"),
      intervencion("OBRA", "CANCELADA"),
      intervencion("MANTENIMIENTO", "FINALIZADA"),
    ];

    const leyenda = construirLeyenda(hechos);

    expect(sumaDe(leyenda.tipos)).toBe(hechos.length);
    expect(sumaDe(leyenda.estados)).toBe(hechos.length);
  });

  it("un tipo desconocido entra a la leyenda bajo el icono generico", () => {
    const leyenda = construirLeyenda([reporte("INVENTADO", "RECIBIDO")]);

    expect(leyenda.tipos).toEqual([
      {
        recurso: "REPORTE",
        tipo: "INVENTADO",
        etiqueta: "INVENTADO",
        icono: "OTRO",
        conteo: 1,
      },
    ]);
  });

  it("sin hechos la leyenda queda vacia y no inventa renglones", () => {
    expect(construirLeyenda([])).toEqual({ tipos: [], estados: [] });
  });
});
