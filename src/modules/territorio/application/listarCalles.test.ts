import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoCalleId, comoLugarId } from "../domain";
import type { CalleGuardada, RepositorioDeCalles } from "./puertos";

/** Por que no hay guarda de rol aca: `listarCalles.ts`. */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarCalles } = await import("./listarCalles");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const lugarId = comoLugarId("11111111-1111-4111-8111-111111111111");

describe("listarCalles", () => {
  const repositorio: RepositorioDeCalles = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    actualizar: vi.fn(),
    contarDomiciliosQueLaUsan: vi.fn(),
    listarPorLugar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("abre el tenant del contexto y delega el listado al repositorio, sin exigir rol", async () => {
    const calles: CalleGuardada[] = [
      {
        id: comoCalleId("22222222-2222-4222-8222-222222222222"),
        nombre: "Calle 21",
        lugarId,
        punto: null,
        bajaEn: null,
      },
    ];
    vi.mocked(repositorio.listarPorLugar).mockResolvedValue(calles);

    const listarCalles = crearListarCalles(repositorio);
    const resultado = await listarCalles(lugarId, contexto);

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(repositorio.listarPorLugar).toHaveBeenCalledWith(
      expect.anything(),
      lugarId,
    );
    expect(resultado).toBe(calles);
  });
});
