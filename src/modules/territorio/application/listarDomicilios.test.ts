import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoCalleId, comoDomicilioId } from "../domain";
import type {
  DomicilioParaListado,
  RepositorioDeDomicilios,
} from "./puertosDeDomicilios";

/** Por que no hay guarda de rol aca: `listarDomicilios.ts`. */
const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarDomicilios } = await import("./listarDomicilios");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("listarDomicilios", () => {
  const repositorio: RepositorioDeDomicilios = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    actualizar: vi.fn(),
    porLugarYSubarbol: vi.fn(),
    porCalle: vi.fn(),
    registro: vi.fn(),
    listar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("abre el tenant del contexto y delega el listado al repositorio, sin exigir rol", async () => {
    const domicilios: DomicilioParaListado[] = [
      {
        id: comoDomicilioId("22222222-2222-4222-8222-222222222222"),
        calle: "Calle 21",
        calleId: comoCalleId("33333333-3333-4333-8333-333333333333"),
        numero: "45",
        lugar: "Comisaria Motul",
      },
    ];
    vi.mocked(repositorio.listar).mockResolvedValue(domicilios);

    const listarDomicilios = crearListarDomicilios(repositorio);
    const resultado = await listarDomicilios(contexto);

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(repositorio.listar).toHaveBeenCalledWith(expect.anything());
    expect(resultado).toBe(domicilios);
  });
});
