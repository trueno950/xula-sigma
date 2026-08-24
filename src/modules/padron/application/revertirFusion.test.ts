import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import type { PersonaId } from "../domain";
import type { RepositorioDePersonas } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearRevertirFusion } = await import("./revertirFusion");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

describe("revertirFusion", () => {
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

  it("rechaza sin puedeFusionarPersonas y no revierte", async () => {
    const revertirFusion = crearRevertirFusion(repositorio);

    await expect(
      revertirFusion("persona-1" as PersonaId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(repositorio.revertirFusion).not.toHaveBeenCalled();
  });

  it("con permiso revierte y registra REVERTIR_FUSION en la misma transaccion", async () => {
    vi.mocked(repositorio.revertirFusion).mockResolvedValue(true);
    const revertirFusion = crearRevertirFusion(repositorio);

    await revertirFusion(
      "persona-1" as PersonaId,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.revertirFusion).toHaveBeenCalledWith(
      expect.anything(),
      "persona-1",
    );
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "REVERTIR_FUSION",
        entidad: "personas",
        entidadId: "persona-1",
      }),
    );
  });

  it("id de otro tenant o inexistente: NoEncontradoError, sin registrar", async () => {
    vi.mocked(repositorio.revertirFusion).mockResolvedValue(false);
    const revertirFusion = crearRevertirFusion(repositorio);

    await expect(
      revertirFusion(
        "persona-ajena" as PersonaId,
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(registrarMock).not.toHaveBeenCalled();
  });
});
