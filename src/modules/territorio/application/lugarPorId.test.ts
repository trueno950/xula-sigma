import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoLugarId } from "../domain";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearLugarPorId } = await import("./lugarPorId");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const coloniaId = comoLugarId("11111111-1111-4111-8111-111111111111");
const lugarGuardado: LugarGuardado = {
  id: coloniaId,
  tipo: "colonia",
  nombre: "Colonia 3",
  padreId: null,
  bajaEn: null,
};

describe("lugarPorId", () => {
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

  it("id existente devuelve el lugar", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(lugarGuardado);
    const lugarPorId = crearLugarPorId(repositorio);

    const resultado = await lugarPorId(coloniaId, contextoCon("CONSULTA"));

    expect(resultado).toEqual(lugarGuardado);
  });

  it("id inexistente o de otro tenant devuelve null, sin lanzar", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const lugarPorId = crearLugarPorId(repositorio);

    const resultado = await lugarPorId(coloniaId, contextoCon("CONSULTA"));

    expect(resultado).toBeNull();
  });
});
