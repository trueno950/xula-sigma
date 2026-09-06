import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { FiltrosDeListado, RepositorioDeConstancias } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarConstancias, TAMANO_DE_PAGINA } = await import(
  "./listarConstancias"
);

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("listarConstancias", () => {
  const repositorio: Pick<RepositorioDeConstancias, "listar"> = {
    listar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("lista vacia cuando el tenant no tiene constancias, nunca lanza", async () => {
    vi.mocked(repositorio.listar).mockResolvedValue([]);
    const listarConstancias = crearListarConstancias(repositorio);

    await expect(listarConstancias({}, contexto)).resolves.toEqual({
      constancias: [],
      hayMas: false,
    });
  });

  it("los filtros pasan tal cual al repositorio, sin guarda de rol", async () => {
    const filtros: FiltrosDeListado = { estado: "VIGENTE" };
    const filas = [{ folio: "VEC-2026-000001" }];
    vi.mocked(repositorio.listar).mockResolvedValue(filas as never);
    const listarConstancias = crearListarConstancias(repositorio);

    const resultado = await listarConstancias(filtros, contexto);

    expect(repositorio.listar).toHaveBeenCalledWith(
      expect.anything(),
      filtros,
      { limite: TAMANO_DE_PAGINA + 1 },
    );
    expect(resultado.constancias).toEqual(filas);
  });

  it("pide limite + 1 al repositorio y recorta la fila de mas antes de devolver", async () => {
    const filas = [
      { folio: "VEC-2026-000001" },
      { folio: "VEC-2026-000002" },
      { folio: "VEC-2026-000003" },
    ];
    vi.mocked(repositorio.listar).mockResolvedValue(filas as never);
    const listarConstancias = crearListarConstancias(repositorio);

    const resultado = await listarConstancias({}, contexto, { limite: 2 });

    expect(repositorio.listar).toHaveBeenCalledWith(
      expect.anything(),
      {},
      {
        limite: 3,
      },
    );
    expect(resultado).toEqual({
      constancias: filas.slice(0, 2),
      hayMas: true,
    });
  });

  it("cuando el repositorio trae limite o menos, hayMas es falso", async () => {
    vi.mocked(repositorio.listar).mockResolvedValue([
      { folio: "VEC-2026-000001" },
    ] as never);
    const listarConstancias = crearListarConstancias(repositorio);

    const resultado = await listarConstancias({}, contexto, { limite: 2 });

    expect(resultado.hayMas).toBe(false);
  });

  it("reenvia el orden pedido al repositorio", async () => {
    vi.mocked(repositorio.listar).mockResolvedValue([]);
    const listarConstancias = crearListarConstancias(repositorio);

    await listarConstancias({}, contexto, {
      orden: { campo: "folio", direccion: "desc" },
    });

    expect(repositorio.listar).toHaveBeenCalledWith(
      expect.anything(),
      {},
      {
        limite: TAMANO_DE_PAGINA + 1,
        orden: { campo: "folio", direccion: "desc" },
      },
    );
  });
});
