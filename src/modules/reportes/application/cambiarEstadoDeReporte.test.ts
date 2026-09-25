import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import { comoReporteId, DuplicadoDeSiMismoError } from "../domain";
import type { ReporteGuardado, RepositorioDeReportes } from "./puertos";

/**
 * Resolucion del original y camino feliz de `cambiarEstadoDeReporte`
 * (tasks.md 5.4). Los rechazos previos al repositorio -autorizacion,
 * existencia, estado terminal, transicion y motivo- viven en
 * `cambiarEstadoDeReporte.validaciones.test.ts`.
 */
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const tx = { execute: vi.fn() };

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));
vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearCambiarEstadoDeReporte } = await import(
  "./cambiarEstadoDeReporte"
);

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const reporteId = comoReporteId("11111111-1111-4111-8111-111111111111");
const originalId = "22222222-2222-4222-8222-222222222222";

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

describe("cambiarEstadoDeReporte", () => {
  const repositorio: Pick<
    RepositorioDeReportes,
    "buscarPorId" | "candidatoAOriginal" | "aplicarTransicion"
  > = {
    buscarPorId: vi.fn(),
    candidatoAOriginal: vi.fn(),
    aplicarTransicion: vi.fn(),
  };
  const movimientos = { agregar: vi.fn(), historialDe: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo(tx),
    );
  });

  const cambiarEstadoDeReporte = () =>
    crearCambiarEstadoDeReporte({ repositorio, movimientos });

  it("candidatoAOriginal se invoca dentro de withTenant, no antes", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardadoCon());
    vi.mocked(repositorio.candidatoAOriginal).mockResolvedValue({
      id: comoReporteId(originalId),
      duplicadoDeReporteId: null,
    });
    vi.mocked(repositorio.aplicarTransicion).mockResolvedValue(true);

    await cambiarEstadoDeReporte()(
      {
        id: reporteId,
        estadoNuevo: "RECHAZADO",
        motivoDeRechazo: "DUPLICADO",
        duplicadoDe: originalId,
      },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    const ordenTenant = withTenantMock.mock.invocationCallOrder[0];
    const ordenCandidato = vi.mocked(repositorio.candidatoAOriginal).mock
      .invocationCallOrder[0];
    expect(ordenTenant).toBeDefined();
    expect(ordenCandidato).toBeDefined();
    expect(ordenTenant as number).toBeLessThan(ordenCandidato as number);
  });

  it("candidatoAOriginal -> null -> NoEncontradoError", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardadoCon());
    vi.mocked(repositorio.candidatoAOriginal).mockResolvedValue(null);

    await expect(
      cambiarEstadoDeReporte()(
        {
          id: reporteId,
          estadoNuevo: "RECHAZADO",
          motivoDeRechazo: "DUPLICADO",
          duplicadoDe: originalId,
        },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("vincularDuplicado con original === id -> DuplicadoDeSiMismoError", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardadoCon());
    // El candidato resuelve al propio reporte que se esta rechazando.
    vi.mocked(repositorio.candidatoAOriginal).mockResolvedValue({
      id: reporteId,
      duplicadoDeReporteId: null,
    });

    await expect(
      cambiarEstadoDeReporte()(
        {
          id: reporteId,
          estadoNuevo: "RECHAZADO",
          motivoDeRechazo: "DUPLICADO",
          duplicadoDe: reporteId,
        },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(DuplicadoDeSiMismoError);
  });

  it("aplicarTransicion -> false -> NoEncontradoError (otra transaccion ya movio el reporte)", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardadoCon());
    vi.mocked(repositorio.aplicarTransicion).mockResolvedValue(false);

    await expect(
      cambiarEstadoDeReporte()(
        {
          id: reporteId,
          estadoNuevo: "EN_ATENCION",
          motivoDeRechazo: null,
          duplicadoDe: null,
        },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("camino feliz: movimientos.agregar con los estados correctos y registrar en la misma llamada", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      guardadoCon({ estado: "RECIBIDO" }),
    );
    vi.mocked(repositorio.aplicarTransicion).mockResolvedValue(true);

    await cambiarEstadoDeReporte()(
      {
        id: reporteId,
        estadoNuevo: "EN_ATENCION",
        motivoDeRechazo: null,
        duplicadoDe: null,
      },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.candidatoAOriginal).not.toHaveBeenCalled();

    const transicion = vi.mocked(repositorio.aplicarTransicion).mock
      .calls[0]?.[1];
    expect(transicion?.estadoAnterior).toBe("RECIBIDO");
    expect(transicion?.estadoNuevo).toBe("EN_ATENCION");
    expect(transicion?.duplicadoDeReporteId).toBeNull();

    const movimiento = vi.mocked(movimientos.agregar).mock.calls[0]?.[1];
    expect(movimiento?.estadoAnterior).toBe("RECIBIDO");
    expect(movimiento?.estadoNuevo).toBe("EN_ATENCION");

    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "CAMBIAR_ESTADO_REPORTE",
        entidad: "reportes",
        entidadId: reporteId,
      }),
    );
  });
});
