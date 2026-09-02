import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoLugarId } from "../domain";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

/** Por que no hay guarda de rol aca: `listarLugares.ts`. */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarLugares } = await import("./listarLugares");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("listarLugares", () => {
  const repositorio: RepositorioDeLugares = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    actualizar: vi.fn(),
    contarHijosActivos: vi.fn(),
    contarDomiciliosColgados: vi.fn(),
    subarbol: vi.fn(),
    listarRaices: vi.fn(),
    listarLugares: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("abre el tenant del contexto y delega el catalogo al repositorio, sin exigir rol", async () => {
    const lugares: LugarGuardado[] = [
      {
        id: comoLugarId("22222222-2222-4222-8222-222222222222"),
        tipo: "colonia",
        nombre: "Colonia Centro",
        padreId: comoLugarId("33333333-3333-4333-8333-333333333333"),
        bajaEn: null,
      },
    ];
    vi.mocked(repositorio.listarLugares).mockResolvedValue(lugares);

    const listarLugares = crearListarLugares(repositorio);
    const resultado = await listarLugares(contexto);

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(repositorio.listarLugares).toHaveBeenCalledWith(expect.anything());
    expect(resultado).toBe(lugares);
  });
});
