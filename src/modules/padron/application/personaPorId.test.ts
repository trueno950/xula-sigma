import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { PersonaId } from "../domain";
import type { PersonaGuardada, RepositorioDePersonas } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearPersonaPorId } = await import("./personaPorId");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const personaGuardada: PersonaGuardada = {
  id: "persona-1" as PersonaId,
  nombres: "Maria Guadalupe",
  primerApellido: "Kumul",
  segundoApellido: null,
  curp: null,
  bajaEn: null,
};

describe("personaPorId", () => {
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

  it("id existente devuelve la persona colapsada al terminal", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(personaGuardada);
    const personaPorId = crearPersonaPorId(repositorio);

    const resultado = await personaPorId(
      "persona-1" as PersonaId,
      contextoCon("CONSULTA"),
    );

    expect(resultado).toEqual(personaGuardada);
  });

  it("id inexistente o de otro tenant devuelve null, sin lanzar", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const personaPorId = crearPersonaPorId(repositorio);

    const resultado = await personaPorId(
      "persona-ajena" as PersonaId,
      contextoCon("CONSULTA"),
    );

    expect(resultado).toBeNull();
  });
});
