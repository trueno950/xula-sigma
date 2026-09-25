import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoReporteId, ReporteCerradoError } from "../domain";
import type { ReporteGuardado, RepositorioDeReportes } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const tx = { execute: vi.fn() };

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));
vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearAsignarAreaDeReporte } = await import("./asignarAreaDeReporte");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const reporteId = comoReporteId("11111111-1111-4111-8111-111111111111");

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

describe("asignarAreaDeReporte", () => {
  const repositorio: Pick<
    RepositorioDeReportes,
    "buscarPorId" | "asignarArea"
  > = {
    buscarPorId: vi.fn(),
    asignarArea: vi.fn(),
  };
  const movimientos = { agregar: vi.fn(), historialDe: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo(tx),
    );
  });

  const asignarAreaDeReporte = () =>
    crearAsignarAreaDeReporte({ repositorio, movimientos });

  it("rechaza sin puedeAdministrarReportes(rol)", async () => {
    await expect(
      asignarAreaDeReporte()(
        { id: reporteId, areaResponsable: "OBRAS_PUBLICAS" },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("buscarPorId -> null -> NoEncontradoError", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);

    await expect(
      asignarAreaDeReporte()(
        { id: reporteId, areaResponsable: "OBRAS_PUBLICAS" },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("reporte terminal -> ReporteCerradoError", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      guardadoCon({ estado: "RESUELTO" }),
    );

    await expect(
      asignarAreaDeReporte()(
        { id: reporteId, areaResponsable: "OBRAS_PUBLICAS" },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(ReporteCerradoError);
  });

  it("asignarArea -> false -> NoEncontradoError", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardadoCon());
    vi.mocked(repositorio.asignarArea).mockResolvedValue(false);

    await expect(
      asignarAreaDeReporte()(
        { id: reporteId, areaResponsable: "OBRAS_PUBLICAS" },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("camino feliz: movimientos.agregar con areaAsignada, estados nulos, y registrar", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardadoCon());
    vi.mocked(repositorio.asignarArea).mockResolvedValue(true);

    await asignarAreaDeReporte()(
      { id: reporteId, areaResponsable: "OBRAS_PUBLICAS" },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    const movimiento = vi.mocked(movimientos.agregar).mock.calls[0]?.[1];
    expect(movimiento?.estadoAnterior).toBeNull();
    expect(movimiento?.estadoNuevo).toBeNull();
    expect(movimiento?.areaAsignada).toBe("OBRAS_PUBLICAS");

    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "ASIGNAR_AREA_REPORTE",
        entidad: "reportes",
        entidadId: reporteId,
      }),
    );
  });
});
