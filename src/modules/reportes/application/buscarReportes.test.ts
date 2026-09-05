import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { RepositorioDeReportes } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearBuscarReportes } = await import("./buscarReportes");
const { TAMANO_DE_PAGINA } = await import("./listarReportes");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

describe("buscarReportes", () => {
  const repositorio: Pick<RepositorioDeReportes, "buscar"> = {
    buscar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("abre el tenant del contexto y delega la busqueda al repositorio, sin exigir rol", async () => {
    const filas = [{ folio: "REP-2026-000001" }];
    vi.mocked(repositorio.buscar).mockResolvedValue(filas as never);
    const buscarReportes = crearBuscarReportes(repositorio);

    const resultado = await buscarReportes("bache", contexto);

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(repositorio.buscar).toHaveBeenCalledWith(
      expect.anything(),
      "bache",
      {
        limite: TAMANO_DE_PAGINA + 1,
      },
    );
    expect(resultado.reportes).toEqual(filas);
  });

  it("pide limite + 1 y recorta la fila de mas antes de devolver", async () => {
    const filas = [
      { folio: "REP-2026-000001" },
      { folio: "REP-2026-000002" },
      { folio: "REP-2026-000003" },
    ];
    vi.mocked(repositorio.buscar).mockResolvedValue(filas as never);
    const buscarReportes = crearBuscarReportes(repositorio);

    const resultado = await buscarReportes("bache", contexto, { limite: 2 });

    expect(repositorio.buscar).toHaveBeenCalledWith(
      expect.anything(),
      "bache",
      { limite: 3 },
    );
    expect(resultado).toEqual({ reportes: filas.slice(0, 2), hayMas: true });
  });

  it("reenvia filtros de estado/tipo al repositorio: convive, no reemplaza", async () => {
    vi.mocked(repositorio.buscar).mockResolvedValue([]);
    const buscarReportes = crearBuscarReportes(repositorio);

    await buscarReportes("bache", contexto, {
      filtros: { estado: "RECIBIDO", tipo: "BACHE" },
    });

    expect(repositorio.buscar).toHaveBeenCalledWith(
      expect.anything(),
      "bache",
      {
        limite: TAMANO_DE_PAGINA + 1,
        filtros: { estado: "RECIBIDO", tipo: "BACHE" },
      },
    );
  });

  it("reenvia el orden pedido al repositorio", async () => {
    vi.mocked(repositorio.buscar).mockResolvedValue([]);
    const buscarReportes = crearBuscarReportes(repositorio);

    await buscarReportes("bache", contexto, {
      orden: { campo: "registrado", direccion: "desc" },
    });

    expect(repositorio.buscar).toHaveBeenCalledWith(
      expect.anything(),
      "bache",
      {
        limite: TAMANO_DE_PAGINA + 1,
        orden: { campo: "registrado", direccion: "desc" },
      },
    );
  });
});
