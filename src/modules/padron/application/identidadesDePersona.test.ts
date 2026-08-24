import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { PersonaId } from "../domain";
import type { RepositorioDePersonas } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearIdentidadesDePersona } = await import("./identidadesDePersona");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

describe("identidadesDePersona", () => {
  const repositorio: RepositorioDePersonas = {
    guardar: vi.fn(),
    actualizar: vi.fn(),
    buscarPorId: vi.fn(),
    marcarBaja: vi.fn(),
    listar: vi.fn(),
    buscar: vi.fn(),
    fusionar: vi.fn(),
    revertirFusion: vi.fn(),
    identidadesDe: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("sin fusion devuelve un arreglo con el propio id", async () => {
    vi.mocked(repositorio.identidadesDe).mockResolvedValue([
      "persona-1" as PersonaId,
    ]);
    const identidadesDePersona = crearIdentidadesDePersona(repositorio);

    const resultado = await identidadesDePersona(
      "persona-1" as PersonaId,
      contextoCon("CONSULTA"),
    );

    expect(resultado).toEqual(["persona-1"]);
  });

  it("fusionada devuelve perdedora y ganadora", async () => {
    vi.mocked(repositorio.identidadesDe).mockResolvedValue([
      "perdedora-1" as PersonaId,
      "ganadora-1" as PersonaId,
    ]);
    const identidadesDePersona = crearIdentidadesDePersona(repositorio);

    const resultado = await identidadesDePersona(
      "perdedora-1" as PersonaId,
      contextoCon("CONSULTA"),
    );

    expect(resultado).toEqual(["perdedora-1", "ganadora-1"]);
  });
});
