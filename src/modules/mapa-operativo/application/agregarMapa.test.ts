import { beforeEach, describe, expect, it, vi } from "vitest";
import { comoIntervencionId } from "@/modules/intervenciones";
import { comoReporteId } from "@/modules/reportes";
import { comoCalleId, comoLugarId } from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { FuentesDeMapa } from "./puertos";

const contexto: ContextoActual = {
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "operador-1", rol: "OPERADOR" },
  origen: "web",
};

const calleConPunto = {
  id: comoCalleId("22222222-2222-4222-8222-222222222222"),
  nombre: "Calle con punto",
  lugarId: comoLugarId("33333333-3333-4333-8333-333333333333"),
  punto: { latitud: 20.9674, longitud: -89.5926 },
  bajaEn: null,
};
const calleSinPunto = {
  ...calleConPunto,
  id: comoCalleId("44444444-4444-4444-8444-444444444444"),
  nombre: "Calle sin punto",
  punto: null,
};

describe("agregarMapa", () => {
  const fuentes: FuentesDeMapa = {
    callesParaMapa: vi.fn(),
    reportesParaMapa: vi.fn(),
    intervencionesParaMapa: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fuentes.callesParaMapa).mockResolvedValue([
      calleConPunto,
      calleSinPunto,
    ]);
    vi.mocked(fuentes.reportesParaMapa).mockResolvedValue([
      {
        id: comoReporteId("55555555-5555-4555-8555-555555555555"),
        folio: "REP-1",
        tipo: "BASURA",
        estado: "RECIBIDO",
        areaResponsable: "OBRAS_PUBLICAS",
        calleId: calleConPunto.id,
      },
      {
        id: comoReporteId("66666666-6666-4666-8666-666666666666"),
        folio: "REP-2",
        tipo: "FUGA",
        estado: "RESUELTO",
        areaResponsable: null,
        calleId: null,
      },
    ]);
    vi.mocked(fuentes.intervencionesParaMapa).mockResolvedValue([
      {
        id: comoIntervencionId("77777777-7777-4777-8777-777777777777"),
        tipo: "OBRA",
        estado: "EN_EJECUCION",
        calleId: calleSinPunto.id,
      },
    ]);
  });

  it("ubica solo hechos con punto de calle y declara los restantes como cobertura faltante", async () => {
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.marcadores).toEqual([
      expect.objectContaining({
        recurso: "REPORTE",
        href: "/reportes/detalle/55555555-5555-4555-8555-555555555555",
        punto: calleConPunto.punto,
      }),
    ]);
    expect(mapa.cobertura).toEqual([
      expect.objectContaining({
        recurso: "REPORTE",
        razon: "SIN_CALLE",
        href: "/reportes/detalle/66666666-6666-4666-8666-666666666666",
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
  });

  it("filtra reportes por tipo sin ocultar intervenciones de otro vocabulario", async () => {
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, {
      tipo: "BASURA",
    });

    expect(mapa.marcadores).toEqual([
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
      },
    ]);
    const { crearAgregarMapa } = await import("./agregarMapa");

    const mapa = await crearAgregarMapa(fuentes)(contexto, { tipo: "FUGA" });

    expect(mapa.conteos).toEqual({ reportes: 1, intervenciones: 1, total: 2 });
  });
});
