import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { RepositorioDeConstancias } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearBuscarConstancias } = await import("./buscarConstancias");
const { TAMANO_DE_PAGINA } = await import("./listarConstancias");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("buscarConstancias", () => {
  const repositorio: Pick<RepositorioDeConstancias, "buscar"> = {
    buscar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("abre el tenant del contexto y delega la busqueda al repositorio, sin exigir rol", async () => {
    const filas = [{ folio: "VEC-2026-000001" }];
    vi.mocked(repositorio.buscar).mockResolvedValue(filas as never);
    const buscarConstancias = crearBuscarConstancias(repositorio);

    const resultado = await buscarConstancias("Poot", contexto);

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(repositorio.buscar).toHaveBeenCalledWith(expect.anything(), "Poot", {
      limite: TAMANO_DE_PAGINA + 1,
    });
    expect(resultado.constancias).toEqual(filas);
  });

  it("pide limite + 1 y recorta la fila de mas antes de devolver", async () => {
    const filas = [
      { folio: "VEC-2026-000001" },
      { folio: "VEC-2026-000002" },
      { folio: "VEC-2026-000003" },
    ];
    vi.mocked(repositorio.buscar).mockResolvedValue(filas as never);
    const buscarConstancias = crearBuscarConstancias(repositorio);

    const resultado = await buscarConstancias("Poot", contexto, {
      limite: 2,
    });

    expect(repositorio.buscar).toHaveBeenCalledWith(expect.anything(), "Poot", {
      limite: 3,
    });
    expect(resultado).toEqual({
      constancias: filas.slice(0, 2),
      hayMas: true,
    });
  });

  it("reenvia el filtro de estado al repositorio: convive, no reemplaza", async () => {
    vi.mocked(repositorio.buscar).mockResolvedValue([]);
    const buscarConstancias = crearBuscarConstancias(repositorio);

    await buscarConstancias("Poot", contexto, {
      filtros: { estado: "VIGENTE" },
    });

    expect(repositorio.buscar).toHaveBeenCalledWith(expect.anything(), "Poot", {
      limite: TAMANO_DE_PAGINA + 1,
      filtros: { estado: "VIGENTE" },
    });
  });

  it("reenvia el orden pedido al repositorio", async () => {
    vi.mocked(repositorio.buscar).mockResolvedValue([]);
    const buscarConstancias = crearBuscarConstancias(repositorio);

    await buscarConstancias("Poot", contexto, {
      orden: { campo: "emitida", direccion: "desc" },
    });

    expect(repositorio.buscar).toHaveBeenCalledWith(expect.anything(), "Poot", {
      limite: TAMANO_DE_PAGINA + 1,
      orden: { campo: "emitida", direccion: "desc" },
    });
  });
});
