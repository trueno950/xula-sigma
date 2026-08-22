import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { RepositorioDePersonas } from "./puertos";

/** Por que no hay guarda de rol aca: `listarPersonas.ts`. */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarPersonas } = await import("./listarPersonas");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("listarPersonas", () => {
  const repositorio: RepositorioDePersonas = {
    guardar: vi.fn(),
    actualizar: vi.fn(),
    buscarPorId: vi.fn(),
    marcarBaja: vi.fn(),
    listar: vi.fn(),
    buscar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("abre el tenant del contexto y delega el listado al repositorio, sin exigir rol", async () => {
    const personas = [
      {
        id: "persona-1",
        nombres: "Juan",
        primerApellido: "Poot",
        segundoApellido: null,
        curp: null,
        bajaEn: null,
      },
    ];
    vi.mocked(repositorio.listar).mockResolvedValue(personas);

    const listarPersonas = crearListarPersonas(repositorio);
    const resultado = await listarPersonas(contexto);

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(repositorio.listar).toHaveBeenCalled();
    expect(resultado).toBe(personas);
  });
});
