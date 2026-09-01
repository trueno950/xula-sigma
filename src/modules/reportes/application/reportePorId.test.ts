import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoReporteId } from "../domain";
import type { ReporteGuardado, RepositorioDeReportes } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearReportePorId } = await import("./reportePorId");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const reporteId = comoReporteId("11111111-1111-4111-8111-111111111111");

const guardado = {
  id: reporteId,
  folio: "REP-2026-000001",
  tipo: "BACHE",
  estado: "RECIBIDO",
  areaResponsable: null,
  lugarId: "22222222-2222-4222-8222-222222222222",
  calleId: null,
  referencia: null,
  descripcion: "Bache grande",
  personaId: null,
  motivoDeRechazo: null,
  duplicadoDeReporteId: null,
  registradoPorUsuarioId: "usuario-1",
  registradoEn: new Date("2026-01-01T00:00:00Z"),
  actualizadoEn: new Date("2026-01-01T00:00:00Z"),
} as ReporteGuardado;

describe("reportePorId", () => {
  const repositorio: Pick<RepositorioDeReportes, "buscarPorId"> = {
    buscarPorId: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("id de otro tenant o inexistente devuelve null, nunca lanza", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const reportePorId = crearReportePorId(repositorio);

    await expect(reportePorId(reporteId, contexto)).resolves.toBeNull();
  });

  it("id existente del propio tenant devuelve la fila, sin guarda de rol", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardado);
    const reportePorId = crearReportePorId(repositorio);

    await expect(reportePorId(reporteId, contexto)).resolves.toEqual(guardado);
  });
});
