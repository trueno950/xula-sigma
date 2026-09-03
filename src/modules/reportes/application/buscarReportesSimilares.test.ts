import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoReporteId } from "../domain";
import type { ReporteSimilar, RepositorioDeReportes } from "./puertos";

/**
 * `buscarReportesSimilares` (tasks.md 7.2, design.md seccion 13): sin
 * guarda de rol, el criterio pasa tal cual al repositorio, y no tiene
 * ninguna rama de rechazo -no participa del alta, asi que no hay forma de
 * que la bloquee (decision 15 de `proposal.md`).
 */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearBuscarReportesSimilares } = await import(
  "./buscarReportesSimilares"
);

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const similar = (parcial: Partial<ReporteSimilar> = {}): ReporteSimilar => ({
  id: comoReporteId("11111111-1111-4111-8111-111111111111"),
  folio: "REP-2026-000001",
  estado: "RECIBIDO",
  descripcion: "Bache grande",
  registradoEn: new Date("2026-01-01T00:00:00Z"),
  ...parcial,
});

describe("buscarReportesSimilares", () => {
  const repositorio: Pick<RepositorioDeReportes, "similaresAbiertos"> = {
    similaresAbiertos: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("un rol CONSULTA obtiene resultados: sin guarda de rol", async () => {
    vi.mocked(repositorio.similaresAbiertos).mockResolvedValue([similar()]);
    const buscarReportesSimilares = crearBuscarReportesSimilares(repositorio);

    await expect(
      buscarReportesSimilares(
        { lugarId: "33333333-3333-4333-8333-333333333333", tipo: "BACHE" },
        contextoCon("CONSULTA"),
      ),
    ).resolves.toEqual([similar()]);
  });

  it("el criterio pasa tal cual al repositorio, sin transformarlo", async () => {
    vi.mocked(repositorio.similaresAbiertos).mockResolvedValue([]);
    const buscarReportesSimilares = crearBuscarReportesSimilares(repositorio);
    const criterio = {
      lugarId: "33333333-3333-4333-8333-333333333333",
      tipo: "FUGA" as const,
    };

    await buscarReportesSimilares(criterio, contextoCon("OPERADOR"));

    expect(repositorio.similaresAbiertos).toHaveBeenCalledWith(
      expect.anything(),
      criterio,
    );
  });
});
