import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "@/shared/lib/errores";
import {
  comoReporteId,
  DuplicadoSinOriginalError,
  ReporteCerradoError,
  TransicionInvalidaError,
} from "../domain";
import type { ReporteGuardado, RepositorioDeReportes } from "./puertos";

/**
 * Rechazos de `cambiarEstadoDeReporte` antes de tocar el repositorio:
 * autorizacion, existencia, estado terminal, transicion y las dos reglas
 * del motivo (tasks.md 5.4). El camino feliz y la resolucion del original
 * viven en `cambiarEstadoDeReporte.test.ts` -mismo limite de 200 lineas
 * que separa este archivo en dos.
 */
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

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

describe("cambiarEstadoDeReporte — rechazos previos al repositorio", () => {
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
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  const cambiarEstadoDeReporte = () =>
    crearCambiarEstadoDeReporte({ repositorio, movimientos });

  const entradaBase = {
    id: reporteId,
    estadoNuevo: "EN_ATENCION" as const,
    motivoDeRechazo: null,
    duplicadoDe: null,
  };

  it("rechaza sin puedeAdministrarReportes(rol) antes de abrir withTenant", async () => {
    await expect(
      cambiarEstadoDeReporte()(entradaBase, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("buscarPorId -> null -> NoEncontradoError", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);

    await expect(
      cambiarEstadoDeReporte()(entradaBase, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("reporte terminal -> ReporteCerradoError", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      guardadoCon({ estado: "RESUELTO" }),
    );

    await expect(
      cambiarEstadoDeReporte()(entradaBase, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(ReporteCerradoError);
  });

  it("transicion fuera de la tabla -> TransicionInvalidaError", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      guardadoCon({ estado: "RECIBIDO" }),
    );

    await expect(
      cambiarEstadoDeReporte()(
        { ...entradaBase, estadoNuevo: "RECIBIDO" },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(TransicionInvalidaError);
  });

  it("RECHAZADO sin motivoDeRechazo -> ValidacionError", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardadoCon());

    await expect(
      cambiarEstadoDeReporte()(
        { ...entradaBase, estadoNuevo: "RECHAZADO" },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(ValidacionError);
  });

  it("motivoDeRechazo presente con nuevo !== RECHAZADO -> ValidacionError", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardadoCon());

    await expect(
      cambiarEstadoDeReporte()(
        { ...entradaBase, motivoDeRechazo: "FUERA_DE_COMPETENCIA" },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(ValidacionError);
  });

  it("motivo DUPLICADO sin duplicadoDe -> DuplicadoSinOriginalError", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardadoCon());

    await expect(
      cambiarEstadoDeReporte()(
        {
          ...entradaBase,
          estadoNuevo: "RECHAZADO",
          motivoDeRechazo: "DUPLICADO",
        },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(DuplicadoSinOriginalError);
  });

  it("duplicadoDe presente con otro motivo -> DuplicadoSinOriginalError", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardadoCon());

    await expect(
      cambiarEstadoDeReporte()(
        {
          ...entradaBase,
          estadoNuevo: "RECHAZADO",
          motivoDeRechazo: "FUERA_DE_COMPETENCIA",
          duplicadoDe: originalId,
        },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(DuplicadoSinOriginalError);
  });
});
