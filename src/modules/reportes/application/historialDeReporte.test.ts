import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoMovimientoId, comoReporteId } from "../domain";
import type {
  MovimientoGuardado,
  RegistroDeMovimientos,
} from "./puertosDeMovimientos";

/**
 * Lectura del historial para `DetalleDeReporte` (tasks.md 7.6), mismo
 * criterio que `historialDeResidencias` de `territorio`: sin guarda de rol,
 * leer no es escribir.
 */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearHistorialDeReporte } = await import("./historialDeReporte");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const reporteId = comoReporteId("11111111-1111-4111-8111-111111111111");

const movimiento = (
  parcial: Partial<MovimientoGuardado> = {},
): MovimientoGuardado => ({
  id: comoMovimientoId("22222222-2222-4222-8222-222222222222"),
  ayuntamientoId: contexto.ayuntamientoId,
  reporteId,
  usuarioId: "usuario-1",
  estadoAnterior: null,
  estadoNuevo: "RECIBIDO",
  areaAsignada: null,
  motivo: null,
  ocurridoEn: new Date("2026-01-01T00:00:00Z"),
  ...parcial,
});

describe("historialDeReporte", () => {
  const movimientos: Pick<RegistroDeMovimientos, "historialDe"> = {
    historialDe: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("delega en movimientos.historialDe con el reporteId, sin guarda de rol", async () => {
    const filas = [movimiento(), movimiento({ estadoNuevo: "EN_ATENCION" })];
    vi.mocked(movimientos.historialDe).mockResolvedValue(filas);
    const historialDeReporte = crearHistorialDeReporte(movimientos);

    await expect(historialDeReporte(reporteId, contexto)).resolves.toEqual(
      filas,
    );
    expect(movimientos.historialDe).toHaveBeenCalledWith(
      expect.anything(),
      reporteId,
    );
  });
});
