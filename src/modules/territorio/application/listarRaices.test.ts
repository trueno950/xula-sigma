import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoLugarId } from "../domain";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

/** Por que no hay guarda de rol aca: `listarRaices.ts`. */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarRaices } = await import("./listarRaices");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("listarRaices", () => {
  const repositorio: RepositorioDeLugares = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    actualizar: vi.fn(),
    contarHijosActivos: vi.fn(),
    contarDomiciliosColgados: vi.fn(),
    subarbol: vi.fn(),
    listarRaices: vi.fn(),
    listarLugares: vi.fn(),
    existeCabecera: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("abre el tenant del contexto y delega las raices al repositorio, sin exigir rol", async () => {
    const raices: LugarGuardado[] = [
      {
        id: comoLugarId("22222222-2222-4222-8222-222222222222"),
        tipo: "comisaria",
        nombre: "Tepakan",
        padreId: null,
        bajaEn: null,
      },
    ];
    vi.mocked(repositorio.listarRaices).mockResolvedValue(raices);

    const listarRaices = crearListarRaices(repositorio);
    const resultado = await listarRaices(contexto);

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(repositorio.listarRaices).toHaveBeenCalledWith(expect.anything());
    expect(resultado).toBe(raices);
  });
});
