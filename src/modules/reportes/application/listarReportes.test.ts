import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { FiltrosDeListado, RepositorioDeReportes } from "./puertos";
import type { CatalogoDeNombres } from "./puertosDeUbicacionesDeReporte";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarReportes, TAMANO_DE_PAGINA } = await import(
  "./listarReportes"
);

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const catalogo: CatalogoDeNombres = {
  lugares: new Map([
    ["lugar-1", { nombre: "Colonia Centro", raizId: "raiz-1" }],
  ]),
  calles: new Map([["calle-1", "Calle 20"]]),
  domicilios: new Map(),
};

/**
 * El lector de territorio entra por parametro -no se compone adentro-: la
 * pagina pide una sola lectura para todas las filas y con ella arma
 * `ubicacion` (S4).
 */
const crearLecturaDeNombres = () => ({
  leer: vi.fn().mockResolvedValue(catalogo),
});

const fila = (folio: string) => ({ folio, lugarId: "lugar-1", calleId: null });

describe("listarReportes", () => {
  const repositorio: Pick<RepositorioDeReportes, "listar"> = {
    listar: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("lista vacia cuando el tenant no tiene reportes, nunca lanza", async () => {
    vi.mocked(repositorio.listar).mockResolvedValue([]);
    const listarReportes = crearListarReportes(
      repositorio,
      crearLecturaDeNombres,
    );

    await expect(listarReportes({}, contexto)).resolves.toEqual({
      reportes: [],
      hayMas: false,
    });
  });

  it("los filtros pasan tal cual al repositorio, sin guarda de rol", async () => {
    const filtros: FiltrosDeListado = { estado: "RECIBIDO", tipo: "BACHE" };
    const filas = [fila("REP-2026-000001")];
    vi.mocked(repositorio.listar).mockResolvedValue(filas as never);
    const listarReportes = crearListarReportes(
      repositorio,
      crearLecturaDeNombres,
    );

    const resultado = await listarReportes(filtros, contexto);

    expect(repositorio.listar).toHaveBeenCalledWith(
      expect.anything(),
      filtros,
      { limite: TAMANO_DE_PAGINA + 1 },
    );
    expect(resultado.reportes.map(({ folio }) => folio)).toEqual([
      "REP-2026-000001",
    ]);
  });

  it("adjunta el lugar y la calle de cada fila (S4)", async () => {
    vi.mocked(repositorio.listar).mockResolvedValue([
      { ...fila("REP-2026-000001"), calleId: "calle-1" },
    ] as never);
    const listarReportes = crearListarReportes(
      repositorio,
      crearLecturaDeNombres,
    );

    const resultado = await listarReportes({}, contexto);

    expect(resultado.reportes[0]?.ubicacion).toEqual({
      modo: "CALLE",
      lugar: "Colonia Centro",
      calleId: "calle-1",
      calle: "Calle 20",
      domicilio: null,
      raizId: "raiz-1",
    });
  });

  it("pide limite + 1 al repositorio y recorta la fila de mas antes de devolver", async () => {
    const filas = [
      fila("REP-2026-000001"),
      fila("REP-2026-000002"),
      fila("REP-2026-000003"),
    ];
    vi.mocked(repositorio.listar).mockResolvedValue(filas as never);
    const listarReportes = crearListarReportes(
      repositorio,
      crearLecturaDeNombres,
    );

    const resultado = await listarReportes({}, contexto, { limite: 2 });

    expect(repositorio.listar).toHaveBeenCalledWith(
      expect.anything(),
      {},
      {
        limite: 3,
      },
    );
    expect(resultado.reportes.map(({ folio }) => folio)).toEqual([
      "REP-2026-000001",
      "REP-2026-000002",
    ]);
    expect(resultado.hayMas).toBe(true);
  });

  it("cuando el repositorio trae limite o menos, hayMas es falso", async () => {
    vi.mocked(repositorio.listar).mockResolvedValue([
      fila("REP-2026-000001"),
    ] as never);
    const listarReportes = crearListarReportes(
      repositorio,
      crearLecturaDeNombres,
    );

    const resultado = await listarReportes({}, contexto, { limite: 2 });

    expect(resultado.hayMas).toBe(false);
  });

  it("reenvia el orden pedido al repositorio", async () => {
    vi.mocked(repositorio.listar).mockResolvedValue([]);
    const listarReportes = crearListarReportes(
      repositorio,
      crearLecturaDeNombres,
    );

    await listarReportes({}, contexto, {
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
