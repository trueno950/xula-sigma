import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import type { PersonaId } from "../domain";
import type { PersonaGuardada, RepositorioDePersonas } from "./puertos";

const personaCon = (id: string): PersonaGuardada => ({
  id: id as PersonaId,
  nombres: "Maria Guadalupe",
  primerApellido: "Kumul",
  segundoApellido: "Pech",
  curp: null,
  bajaEn: null,
});

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearFusionarPersonas } = await import("./fusionarPersonas");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

describe("fusionarPersonas", () => {
  const repositorio: RepositorioDePersonas = {
    guardar: vi.fn(),
    actualizar: vi.fn(),
    buscarPorId: vi.fn(),
    marcarBaja: vi.fn(),
    listar: vi.fn(),
    buscar: vi.fn(),
    fusionar: vi.fn(),
    revertirFusion: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("rechaza sin puedeFusionarPersonas y no fusiona", async () => {
    const fusionarPersonas = crearFusionarPersonas(repositorio);

    await expect(
      fusionarPersonas(
        "persona-1" as PersonaId,
        "persona-2" as PersonaId,
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(repositorio.fusionar).not.toHaveBeenCalled();
  });

  it("rechaza con NoEncontradoError cuando la perdedora no existe o es de otro tenant", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const fusionarPersonas = crearFusionarPersonas(repositorio);

    await expect(
      fusionarPersonas(
        "persona-ajena" as PersonaId,
        "persona-2" as PersonaId,
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.fusionar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("rechaza con NoEncontradoError cuando la ganadora no existe o es de otro tenant", async () => {
    vi.mocked(repositorio.buscarPorId).mockImplementation(async (_tx, id) =>
      id === ("persona-1" as PersonaId) ? personaCon("persona-1") : null,
    );
    const fusionarPersonas = crearFusionarPersonas(repositorio);

    await expect(
      fusionarPersonas(
        "persona-1" as PersonaId,
        "persona-ajena" as PersonaId,
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.fusionar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("auto-fusion (los dos ids resuelven al mismo terminal) no-opera", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      personaCon("persona-1"),
    );
    const fusionarPersonas = crearFusionarPersonas(repositorio);

    await fusionarPersonas(
      "persona-1" as PersonaId,
      "persona-1-alias" as PersonaId,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.fusionar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("con permiso fusiona sobre los terminales resueltos y registra FUSIONAR_PERSONA", async () => {
    vi.mocked(repositorio.buscarPorId).mockImplementation(async (_tx, id) =>
      id === ("persona-1" as PersonaId)
        ? personaCon("terminal-perdedora")
        : personaCon("terminal-ganadora"),
    );
    const fusionarPersonas = crearFusionarPersonas(repositorio);

    await fusionarPersonas(
      "persona-1" as PersonaId,
      "persona-2" as PersonaId,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.fusionar).toHaveBeenCalledWith(
      expect.anything(),
      "terminal-perdedora",
      "terminal-ganadora",
    );
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "FUSIONAR_PERSONA",
        entidad: "personas",
        entidadId: "terminal-perdedora",
      }),
    );
  });
});
