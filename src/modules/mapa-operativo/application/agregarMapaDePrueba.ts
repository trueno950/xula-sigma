import { vi } from "vitest";
import { comoIntervencionId } from "@/modules/intervenciones";
import { comoReporteId } from "@/modules/reportes";
import { comoCalleId, comoLugarId } from "@/modules/territorio";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { FuentesDeMapa } from "./puertos";

/**
 * Fixtures compartidas por los tests del agregado del mapa, que crecieron
 * con S1 de `gestion-municipal` (la senal de atraso vive en su propio
 * archivo por la metrica de lineas). No es un `*.test.ts`, asi que vitest no
 * lo recoge como suite; mismo criterio que `territorioDelMapaDePrueba.ts`.
 */
export const contexto: ContextoActual = {
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "operador-1", rol: "OPERADOR" },
  origen: "web",
};

export const calleConPunto = {
  id: comoCalleId("22222222-2222-4222-8222-222222222222"),
  nombre: "Calle con punto",
  lugarId: comoLugarId("33333333-3333-4333-8333-333333333333"),
  punto: { latitud: 20.9674, longitud: -89.5926 },
  bajaEn: null,
};

export const calleSinPunto = {
  ...calleConPunto,
  id: comoCalleId("44444444-4444-4444-8444-444444444444"),
  nombre: "Calle sin punto",
  punto: null,
};

export const REPORTE_EN_CALLE = comoReporteId(
  "55555555-5555-4555-8555-555555555555",
);
export const REPORTE_SIN_CALLE = comoReporteId(
  "66666666-6666-4666-8666-666666666666",
);
export const INTERVENCION_EN_CALLE = comoIntervencionId(
  "77777777-7777-4777-8777-777777777777",
);

export const crearFuentesDeMapa = (): FuentesDeMapa => ({
  callesParaMapa: vi.fn(),
  reportesParaMapa: vi.fn(),
  umbralDeAtraso: vi.fn(),
  intervencionesParaMapa: vi.fn(),
  territoriosParaMapa: vi.fn(),
  lugaresDelSubarbol: vi.fn(),
});

/**
 * Deja las fuentes en el escenario base de cada test: dos calles -una con
 * punto y otra sin-, dos reportes y una intervencion. `umbralDeAtraso` en 7,
 * el valor por defecto, y todas las fechas de registro fuera de la ventana:
 * el atraso es lo que el test que lo mide decide, no el fixture.
 */
export const sembrarHechos = (fuentes: FuentesDeMapa): void => {
  vi.clearAllMocks();
  vi.mocked(fuentes.territoriosParaMapa).mockResolvedValue([]);
  vi.mocked(fuentes.lugaresDelSubarbol).mockResolvedValue([]);
  vi.mocked(fuentes.umbralDeAtraso).mockResolvedValue(7);
  vi.mocked(fuentes.callesParaMapa).mockResolvedValue([
    calleConPunto,
    calleSinPunto,
  ]);
  vi.mocked(fuentes.reportesParaMapa).mockResolvedValue([
    {
      id: REPORTE_EN_CALLE,
      folio: "REP-1",
      tipo: "BASURA",
      estado: "RECIBIDO",
      areaResponsable: "OBRAS_PUBLICAS",
      calleId: calleConPunto.id,
      lugarId: calleConPunto.lugarId,
      fechaDeRegistro: "2026-11-16",
    },
    {
      id: REPORTE_SIN_CALLE,
      folio: "REP-2",
      tipo: "FUGA",
      estado: "RESUELTO",
      areaResponsable: null,
      calleId: null,
      lugarId: calleConPunto.lugarId,
      fechaDeRegistro: "2026-11-16",
    },
  ]);
  vi.mocked(fuentes.intervencionesParaMapa).mockResolvedValue([
    {
      id: INTERVENCION_EN_CALLE,
      tipo: "OBRA",
      estado: "EN_EJECUCION",
      calleId: calleSinPunto.id,
      lugarId: calleSinPunto.lugarId,
    },
  ]);
};
