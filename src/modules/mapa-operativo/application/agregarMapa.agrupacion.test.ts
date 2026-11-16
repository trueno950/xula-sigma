import { beforeEach, describe, expect, it, vi } from "vitest";
import { comoIntervencionId } from "@/modules/intervenciones";
import { comoReporteId } from "@/modules/reportes";
import { comoLugarId } from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import { colorDeEstado } from "../domain";
import { crearAgregarMapa } from "./agregarMapa";
import type { FuentesDeMapa } from "./puertos";

const contexto: ContextoActual = {
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "operador-1", rol: "OPERADOR" },
  origen: "web",
};

const LUGAR = comoLugarId("33333333-3333-4333-8333-333333333333");
const CALLE = "22222222-2222-4222-8222-222222222222";
const PUNTO = { latitud: 20.9674, longitud: -89.5926 };

const reporte = (id: string, folio: string, estado: string) => ({
  id: comoReporteId(id),
  folio,
  tipo: "BACHE",
  estado,
  areaResponsable: null,
  calleId: CALLE,
  lugarId: LUGAR,
});

const fuentes: FuentesDeMapa = {
  callesParaMapa: vi.fn(),
  reportesParaMapa: vi.fn(),
  intervencionesParaMapa: vi.fn(),
  territoriosParaMapa: vi.fn(),
  lugaresDelSubarbol: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fuentes.territoriosParaMapa).mockResolvedValue([]);
  vi.mocked(fuentes.lugaresDelSubarbol).mockResolvedValue([]);
  vi.mocked(fuentes.callesParaMapa).mockResolvedValue([
    { id: CALLE, nombre: "Calle 20", lugarId: LUGAR, punto: PUNTO },
  ]);
  vi.mocked(fuentes.reportesParaMapa).mockResolvedValue([
    reporte("55555555-5555-4555-8555-555555555555", "REP-1", "RECIBIDO"),
    reporte("66666666-6666-4666-8666-666666666666", "REP-2", "RECIBIDO"),
  ]);
  vi.mocked(fuentes.intervencionesParaMapa).mockResolvedValue([
    {
      id: comoIntervencionId("77777777-7777-4777-8777-777777777777"),
      tipo: "OBRA",
      estado: "PLANIFICADA",
      calleId: CALLE,
      lugarId: LUGAR,
    },
  ]);
});

describe("agregarMapa: hechos que comparten calle", () => {
  it("los hechos de una misma calle se agrupan en un marcador", async () => {
    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.marcadores).toHaveLength(1);
    expect(mapa.marcadores[0]?.clave).toBe(CALLE);
    expect(mapa.marcadores[0]?.punto).toEqual(PUNTO);
    expect(mapa.marcadores[0]?.hechos.map((h) => h.etiqueta)).toEqual([
      "REP-1",
      "REP-2",
      "Obra",
    ]);
  });

  it("el marcador lleva el icono y el color del hecho predominante", async () => {
    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.marcadores[0]?.icono).toBe("BACHE");
    expect(mapa.marcadores[0]?.color).toBe(colorDeEstado("RECIBIDO"));
  });

  it("cada hecho del marcador conserva su propio color y su propio icono", async () => {
    const mapa = await crearAgregarMapa(fuentes)(contexto, {});
    const hechos = mapa.marcadores[0]?.hechos ?? [];

    expect(hechos[2]?.icono).toBe("OBRA");
    expect(hechos[2]?.color).toBe(colorDeEstado("PLANIFICADA"));
    expect(hechos[2]?.color).not.toBe(hechos[0]?.color);
  });
});

describe("agregarMapa: leyenda", () => {
  it("cuenta por tipo y por estado los hechos que pasaron el filtro", async () => {
    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.leyenda.tipos).toEqual([
      {
        recurso: "REPORTE",
        tipo: "BACHE",
        etiqueta: "Bache",
        icono: "BACHE",
        conteo: 2,
      },
      {
        recurso: "INTERVENCION",
        tipo: "OBRA",
        etiqueta: "Obra",
        icono: "OBRA",
        conteo: 1,
      },
    ]);
    expect(mapa.leyenda.estados).toEqual([
      {
        estado: "RECIBIDO",
        etiqueta: "Recibido",
        color: colorDeEstado("RECIBIDO"),
        conteo: 2,
      },
      {
        estado: "PLANIFICADA",
        etiqueta: "Planificada",
        color: colorDeEstado("PLANIFICADA"),
        conteo: 1,
      },
    ]);
  });

  it("la leyenda se rehace con el filtro vigente y no cuenta lo que quedo afuera", async () => {
    // El area solo filtra reportes, y deja fuera a las intervenciones.
    vi.mocked(fuentes.reportesParaMapa).mockResolvedValueOnce([
      {
        ...reporte("55555555-5555-4555-8555-555555555555", "REP-1", "RECIBIDO"),
        areaResponsable: "OBRAS_PUBLICAS",
      },
    ]);
    const mapa = await crearAgregarMapa(fuentes)(contexto, {
      area: "OBRAS_PUBLICAS",
    });

    expect(mapa.leyenda.tipos).toEqual([
      expect.objectContaining({ tipo: "BACHE", conteo: 1 }),
    ]);
    expect(mapa.leyenda.estados).toEqual([
      expect.objectContaining({ estado: "RECIBIDO", conteo: 1 }),
    ]);
  });
});
