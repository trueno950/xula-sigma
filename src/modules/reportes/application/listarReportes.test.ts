import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { FiltrosDeListado, RepositorioDeReportes } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarReportes } = await import("./listarReportes");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("listarReportes", () => {
  const repositorio: Pick<RepositorioDeReportes, "listar"> = {
    listar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("lista vacia cuando el tenant no tiene reportes, nunca lanza", async () => {
    vi.mocked(repositorio.listar).mockResolvedValue([]);
    const listarReportes = crearListarReportes(repositorio);

    await expect(listarReportes({}, contexto)).resolves.toEqual([]);
  });

  it("los filtros pasan tal cual al repositorio, sin guarda de rol", async () => {
    const filtros: FiltrosDeListado = { estado: "RECIBIDO", tipo: "BACHE" };
    const filas = [{ folio: "REP-2026-000001" }];
    vi.mocked(repositorio.listar).mockResolvedValue(filas as never);
    const listarReportes = crearListarReportes(repositorio);

    await expect(listarReportes(filtros, contexto)).resolves.toEqual(filas);
    expect(repositorio.listar).toHaveBeenCalledWith(expect.anything(), filtros);
  });
});
