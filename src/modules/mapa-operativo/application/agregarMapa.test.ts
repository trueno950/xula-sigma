import { beforeEach, describe, expect, it, vi } from "vitest";
import { comoIntervencionId } from "@/modules/intervenciones";
import {
  calleConPunto,
  calleSinPunto,
  contexto,
  crearFuentesDeMapa,
  REPORTE_EN_CALLE,
  REPORTE_SIN_CALLE,
  sembrarHechos,
} from "./agregarMapaDePrueba";

describe("agregarMapa", () => {
  const fuentes = crearFuentesDeMapa();

  beforeEach(() => sembrarHechos(fuentes));

  it("ubica solo hechos con punto de calle y declara los restantes como cobertura faltante", async () => {
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.marcadores).toEqual([
      expect.objectContaining({
        punto: calleConPunto.punto,
        hechos: [
          expect.objectContaining({
            recurso: "REPORTE",
            href: `/reportes/detalle/${REPORTE_EN_CALLE}`,
          }),
        ],
      }),
    ]);
    expect(mapa.cobertura).toEqual([
      expect.objectContaining({
        recurso: "REPORTE",
        razon: "SIN_CALLE",
        href: `/reportes/detalle/${REPORTE_SIN_CALLE}`,
        calle: null,
      }),
      expect.objectContaining({
        recurso: "INTERVENCION",
        razon: "CALLE_SIN_PUNTO",
        href: "/intervenciones/77777777-7777-4777-8777-777777777777",
        calle: calleSinPunto.nombre,
      }),
    ]);
    expect(mapa.conteos).toEqual({ reportes: 2, intervenciones: 1, total: 3 });
  });

  it("aplica el filtro de area a marcadores, cobertura y conteos sin conservar intervenciones", async () => {
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, {
      area: "OBRAS_PUBLICAS",
    });

    expect(mapa.marcadores).toHaveLength(1);
    expect(mapa.cobertura).toEqual([]);
    expect(mapa.conteos).toEqual({ reportes: 1, intervenciones: 0, total: 1 });
  });

  it("pasa el contexto del servidor a las tres lecturas propias", async () => {
    const { crearAgregarMapa } = await import("./agregarMapa");

    await crearAgregarMapa(fuentes)(contexto, { estado: "RECIBIDO" });

    expect(fuentes.callesParaMapa).toHaveBeenCalledWith(contexto);
    expect(fuentes.reportesParaMapa).toHaveBeenCalledWith(contexto);
    expect(fuentes.intervencionesParaMapa).toHaveBeenCalledWith(contexto);
    expect(fuentes.territoriosParaMapa).toHaveBeenCalledWith(contexto);
  });

  it("la etiqueta de una intervencion es su tipo legible, no el codigo", async () => {
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.cobertura).toContainEqual(
      expect.objectContaining({ recurso: "INTERVENCION", etiqueta: "Obra" }),
    );
  });

  it("filtra reportes por tipo sin ocultar intervenciones de otro vocabulario", async () => {
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, {
      tipo: "BASURA",
    });

    expect(mapa.marcadores.flatMap((marcador) => marcador.hechos)).toEqual([
      expect.objectContaining({ recurso: "REPORTE", etiqueta: "REP-1" }),
    ]);
    expect(mapa.cobertura).toEqual([
      expect.objectContaining({ recurso: "INTERVENCION" }),
    ]);
    expect(mapa.conteos).toEqual({ reportes: 1, intervenciones: 1, total: 2 });
  });

  it("filtra intervenciones por estado propio sin ocultar reportes", async () => {
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, {
      estado: "EN_EJECUCION",
    });

    expect(mapa.conteos).toEqual({ reportes: 2, intervenciones: 1, total: 3 });
    expect(
      mapa.cobertura.some((entrada) => entrada.recurso === "INTERVENCION"),
    ).toBe(true);
  });

  it("un estado del vocabulario de reportes no vacia las intervenciones", async () => {
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, {
      estado: "RECIBIDO",
    });

    expect(mapa.conteos.reportes).toBe(1);
    expect(mapa.conteos.intervenciones).toBe(1);
  });

  it("un tipo compartido entre vocabularios filtra ambos recursos a la vez", async () => {
    vi.mocked(fuentes.intervencionesParaMapa).mockResolvedValueOnce([
      {
        id: comoIntervencionId("88888888-8888-4888-8888-888888888888"),
        tipo: "FUGA",
        estado: "PLANIFICADA",
        calleId: calleConPunto.id,
        lugarId: calleConPunto.lugarId,
      },
    ]);
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, { tipo: "FUGA" });

    expect(mapa.conteos).toEqual({ reportes: 1, intervenciones: 1, total: 2 });
  });
});
