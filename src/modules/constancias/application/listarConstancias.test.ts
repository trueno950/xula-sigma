import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { RepositorioDeConstancias } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarConstancias } = await import("./listarConstancias");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("listarConstancias", () => {
  const repositorio: RepositorioDeConstancias = {
    guardar: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    listar: vi.fn(),
    paraValidar: vi.fn(),
    registrarReimpresion: vi.fn(),
    existeReimpresion: vi.fn(),
    cancelar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("lista vacia cuando el tenant no tiene constancias, nunca lanza", async () => {
    vi.mocked(repositorio.listar).mockResolvedValue([]);
    const listarConstancias = crearListarConstancias(repositorio);

    await expect(listarConstancias(contexto)).resolves.toEqual([]);
  });

  it("devuelve exactamente lo que el repositorio lista para ese tenant", async () => {
    const filas = [{ folio: "VEC-2026-000001" }, { folio: "VEC-2026-000002" }];
    vi.mocked(repositorio.listar).mockResolvedValue(filas as never);
    const listarConstancias = crearListarConstancias(repositorio);

    await expect(listarConstancias(contexto)).resolves.toEqual(filas);
    expect(repositorio.listar).toHaveBeenCalledWith(
      expect.anything(),
      contexto.ayuntamientoId,
    );
  });
});
