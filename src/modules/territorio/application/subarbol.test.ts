import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoLugarId } from "../domain";
import type { NodoDeSubarbol, RepositorioDeLugares } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearSubarbol } = await import("./subarbol");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const sectorId = comoLugarId("11111111-1111-4111-8111-111111111111");
const nodos: readonly NodoDeSubarbol[] = [
  {
    clase: "lugar",
    id: comoLugarId("22222222-2222-4222-8222-222222222222"),
    tipo: "manzana",
    nombre: "Manzana 1",
    padreId: sectorId,
  },
];

describe("subarbol", () => {
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

  it("devuelve los nodos del subarbol de la raiz pedida", async () => {
    vi.mocked(repositorio.subarbol).mockResolvedValue(nodos);
    const subarbol = crearSubarbol(repositorio);

    const resultado = await subarbol(sectorId, contextoCon("CONSULTA"));

    expect(resultado).toEqual(nodos);
    expect(repositorio.subarbol).toHaveBeenCalledWith(
      expect.anything(),
      sectorId,
    );
  });
});
