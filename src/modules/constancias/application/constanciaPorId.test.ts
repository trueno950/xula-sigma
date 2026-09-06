import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoConstanciaId } from "../domain";
import type { ConstanciaGuardada, RepositorioDeConstancias } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearConstanciaPorId } = await import("./constanciaPorId");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const constanciaId = comoConstanciaId("11111111-1111-4111-8111-111111111111");

const guardada = {
  id: constanciaId,
  ayuntamientoId: contexto.ayuntamientoId,
  tipo: "VECINDAD",
  folio: "VEC-2026-000001",
  anio: 2026,
  consecutivo: 1,
  codigoVerificacion: "abc123",
  personaId: "22222222-2222-4222-8222-222222222222",
  datos: {},
  plantillaVersion: "v1",
  emitidaPorUsuarioId: "usuario-1",
  emitidaEn: new Date("2026-01-01T00:00:00Z"),
  canceladaEn: null,
  canceladaPorUsuarioId: null,
  motivoCancelacion: null,
} as unknown as ConstanciaGuardada;

describe("constanciaPorId", () => {
  const repositorio: RepositorioDeConstancias = {
    guardar: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    listar: vi.fn(),
    buscar: vi.fn(),
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

  it("id de otro tenant o inexistente devuelve null, nunca lanza", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const constanciaPorId = crearConstanciaPorId(repositorio);

    await expect(constanciaPorId(constanciaId, contexto)).resolves.toBeNull();
  });

  it("id existente del propio tenant devuelve la fila", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardada);
    const constanciaPorId = crearConstanciaPorId(repositorio);

    await expect(constanciaPorId(constanciaId, contexto)).resolves.toEqual(
      guardada,
    );
  });
});
