import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  comoReporteId,
  ReporteCerradoError,
  TransicionInvalidaError,
} from "../domain";
import type { ReporteGuardado } from "./puertos";

/**
 * `cambiarEstadoDeReporte` y `asignarAreaDeReporte` publican como ultimo paso
 * de su transaccion (D1/D2 de `mapa-operativo-territorial`); el alta vive en
 * `publicacionDeReportes.test.ts` y la entrega real, al COMMIT y solo al
 * tenant dueño, en `notificacionDeReportes.integration.test.ts`.
 */
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const publicarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));
vi.mock("@/shared/notificaciones/notificar", () => ({
  publicarActualizacion: publicarMock,
}));

const { crearCambiarEstadoDeReporte } = await import(
  "./cambiarEstadoDeReporte"
);
const { crearAsignarAreaDeReporte } = await import("./asignarAreaDeReporte");

const tx = { marca: "tx-del-caso-de-uso" };
const ayuntamientoId =
  "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"];
const reporteId = comoReporteId("22222222-2222-4222-8222-222222222222");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId,
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const guardadoCon = (
  parcial: Partial<ReporteGuardado> = {},
): ReporteGuardado => ({
  id: reporteId,
  folio: "REP-2026-000001",
  tipo: "BACHE",
  estado: "RECIBIDO",
  areaResponsable: null,
  lugarId: "33333333-3333-4333-8333-333333333333",
  calleId: null,
  referencia: null,
  descripcion: "Bache grande",
  personaId: null,
  motivoDeRechazo: null,
  duplicadoDeReporteId: null,
  registradoPorUsuarioId: "usuario-1",
  registradoEn: new Date("2026-01-01T00:00:00Z"),
  actualizadoEn: new Date("2026-01-01T00:00:00Z"),
  ...parcial,
});

const despuesDe = (anterior: Mock, posterior: Mock) =>
  expect(anterior.mock.invocationCallOrder[0]).toBeLessThan(
    posterior.mock.invocationCallOrder[0] as number,
  );

beforeEach(() => {
  vi.resetAllMocks();
  withTenantMock.mockImplementation(
    (_id: unknown, trabajo: (actual: unknown) => unknown) => trabajo(tx),
  );
});

describe("cambiarEstadoDeReporte publica el estado", () => {
  const repositorio = {
    buscarPorId: vi.fn(),
    candidatoAOriginal: vi.fn(),
    aplicarTransicion: vi.fn(),
  };
  const movimientos = { agregar: vi.fn(), historialDe: vi.fn() };
  const cambiarEstado = crearCambiarEstadoDeReporte({
    repositorio,
    movimientos,
  });
  const entrada = {
    id: reporteId,
    estadoNuevo: "EN_ATENCION" as const,
    motivoDeRechazo: null,
    duplicadoDe: null,
  };

  it("publica {reporte, id, estado} en el tx, despues de transicionar y auditar", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardadoCon());
    repositorio.aplicarTransicion.mockResolvedValue(true);

    await cambiarEstado(entrada, contextoCon("ADMIN_MUNICIPAL"));

    expect(publicarMock).toHaveBeenCalledTimes(1);
    expect(publicarMock).toHaveBeenCalledWith(tx, ayuntamientoId, {
      tipo: "reporte",
      id: reporteId,
      cambio: "estado",
    });
    despuesDe(repositorio.aplicarTransicion, publicarMock);
    despuesDe(movimientos.agregar, publicarMock);
    despuesDe(registrarMock, publicarMock);
  });

  it.each([
    {
      caso: "transicion invalida",
      actual: guardadoCon({ estado: "EN_ATENCION" }),
      estadoNuevo: "RECIBIDO",
      error: TransicionInvalidaError,
    },
    {
      caso: "reporte cerrado",
      actual: guardadoCon({ estado: "RESUELTO" }),
      estadoNuevo: "EN_ATENCION",
      error: ReporteCerradoError,
    },
  ] as const)(
    "no publica ante $caso",
    async ({ actual, estadoNuevo, error }) => {
      repositorio.buscarPorId.mockResolvedValue(actual);

      await expect(
        cambiarEstado(
          { ...entrada, estadoNuevo },
          contextoCon("ADMIN_MUNICIPAL"),
        ),
      ).rejects.toBeInstanceOf(error);

      expect(publicarMock).not.toHaveBeenCalled();
    },
  );

  it("no publica si otra transaccion ya movio el reporte", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardadoCon());
    repositorio.aplicarTransicion.mockResolvedValue(false);

    await expect(
      cambiarEstado(entrada, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(publicarMock).not.toHaveBeenCalled();
  });
});

describe("asignarAreaDeReporte publica el area", () => {
  const repositorio = { buscarPorId: vi.fn(), asignarArea: vi.fn() };
  const movimientos = { agregar: vi.fn() };
  const asignarArea = crearAsignarAreaDeReporte({ repositorio, movimientos });
  const entrada = { id: reporteId, areaResponsable: "OBRAS_PUBLICAS" as const };

  it("publica {reporte, id, area} en el tx, despues de asignar y auditar", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardadoCon());
    repositorio.asignarArea.mockResolvedValue(true);

    await asignarArea(entrada, contextoCon("ADMIN_MUNICIPAL"));

    expect(publicarMock).toHaveBeenCalledTimes(1);
    expect(publicarMock).toHaveBeenCalledWith(tx, ayuntamientoId, {
      tipo: "reporte",
      id: reporteId,
      cambio: "area",
    });
    despuesDe(repositorio.asignarArea, publicarMock);
    despuesDe(movimientos.agregar, publicarMock);
    despuesDe(registrarMock, publicarMock);
  });

  it("no publica sobre un reporte cerrado", async () => {
    repositorio.buscarPorId.mockResolvedValue(
      guardadoCon({ estado: "RESUELTO" }),
    );

    await expect(
      asignarArea(entrada, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(ReporteCerradoError);

    expect(publicarMock).not.toHaveBeenCalled();
  });

  it("no publica si el reporte no es visible para el tenant", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardadoCon());
    repositorio.asignarArea.mockResolvedValue(false);

    await expect(
      asignarArea(entrada, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(publicarMock).not.toHaveBeenCalled();
  });
});
