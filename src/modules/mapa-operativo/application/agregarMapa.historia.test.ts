import { describe, expect, it, vi } from "vitest";
import { comoIntervencionId } from "@/modules/intervenciones";
import { comoReporteId } from "@/modules/reportes";
import { comoCalleId, comoLugarId } from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import { crearAgregarMapa } from "./agregarMapa";
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

const intervencionEn = (id: string, calleId: typeof calleConPunto.id) => ({
  id: comoIntervencionId(id),
  tipo: "OBRA" as const,
  estado: "EN_EJECUCION" as const,
  calleId,
});

const fuentes: FuentesDeMapa = {
  callesParaMapa: vi.fn().mockResolvedValue([calleConPunto, calleSinPunto]),
  reportesParaMapa: vi.fn().mockResolvedValue([
    {
      id: comoReporteId("55555555-5555-4555-8555-555555555555"),
      folio: "REP-1",
      tipo: "BASURA",
      estado: "RECIBIDO",
      areaResponsable: null,
      calleId: calleConPunto.id,
    },
    {
      id: comoReporteId("66666666-6666-4666-8666-666666666666"),
      folio: "REP-2",
      tipo: "FUGA",
      estado: "RECIBIDO",
      areaResponsable: null,
      calleId: null,
    },
  ]),
  intervencionesParaMapa: vi
    .fn()
    .mockResolvedValue([
      intervencionEn("88888888-8888-4888-8888-888888888888", calleConPunto.id),
      intervencionEn("77777777-7777-4777-8777-777777777777", calleSinPunto.id),
    ]),
};

describe("agregarMapa: enlace al historial de calle", () => {
  it("enlaza cada marcador, de reporte o de intervencion, al historial de su calle", async () => {
    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.marcadores.map(({ recurso }) => recurso).sort()).toEqual([
      "INTERVENCION",
      "REPORTE",
    ]);
    for (const marcador of mapa.marcadores) {
      expect(marcador.historiaHref).toBe(
        `/calles/${calleConPunto.id}/historial`,
      );
    }
  });

  it("no lleva enlace en la cobertura faltante, que no tiene punto que abrir", async () => {
    const mapa = await crearAgregarMapa(fuentes)(contexto, {});

    expect(mapa.cobertura.map(({ recurso }) => recurso).sort()).toEqual([
      "INTERVENCION",
      "REPORTE",
    ]);
    expect(mapa.cobertura.some((entrada) => "historiaHref" in entrada)).toBe(
      false,
    );
  });
});
