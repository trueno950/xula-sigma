import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoLugarId, NombreDeZonaDuplicadoError } from "../domain";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";
import type { RepositorioDeAdministracionDeZonas } from "./puertosDeAdministracionDeZonas";

/** Solo `buscarPorId`: el caso de uso no necesita el resto del puerto. */
type RepositorioDeZonasPorId = Pick<RepositorioDeLugares, "buscarPorId">;

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearAltaDeZona } = await import("./altaDeZona");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const lugarId = comoLugarId("22222222-2222-4222-8222-222222222222");

const asentamiento: LugarGuardado = {
  id: lugarId,
  nombre: "Motul",
  tipo: "cabecera",
  padreId: null,
  bajaEn: null,
};

const repositorioDeZonas = (): RepositorioDeAdministracionDeZonas => ({
  buscarActivaPorNombre: vi.fn().mockResolvedValue(null),
  crear: vi.fn(),
  bloquearPorId: vi.fn(),
  renombrar: vi.fn(),
  darDeBaja: vi.fn(),
  calleActivaPorId: vi.fn(),
  perteneceLaCalle: vi.fn().mockResolvedValue(false),
  agregarCalle: vi.fn(),
  quitarCalle: vi.fn(),
});

describe("alta de zona", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("rechaza a quien no administra territorio", async () => {
    const repositorio = repositorioDeZonas();
    const repositorioDeLugares = (): RepositorioDeZonasPorId => ({
      buscarPorId: vi.fn(),
    });

    await expect(
      crearAltaDeZona(repositorio, repositorioDeLugares())(
        { nombre: "Centro", lugarId },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);
    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("rechaza un lugarId inexistente o de otro tenant", async () => {
    const repositorio = repositorioDeZonas();
    const repositorioDeLugares = (): RepositorioDeZonasPorId => ({
      buscarPorId: vi.fn().mockResolvedValue(null),
    });

    await expect(
      crearAltaDeZona(repositorio, repositorioDeLugares())(
        { nombre: "Centro", lugarId },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it("rechaza un lugar que no es asentamiento", async () => {
    const repositorio = repositorioDeZonas();
    const repositorioDeLugares = (): RepositorioDeZonasPorId => ({
      buscarPorId: vi.fn().mockResolvedValue({
        ...asentamiento,
        tipo: "colonia",
      }),
    });

    await expect(
      crearAltaDeZona(repositorio, repositorioDeLugares())(
        { nombre: "Centro", lugarId },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it("rechaza el nombre repetido dentro del asentamiento (S6)", async () => {
    const repositorio = repositorioDeZonas();
    vi.mocked(repositorio.buscarActivaPorNombre).mockResolvedValue({
      id: "11111111-1111-4111-8111-111111111111" as never,
      nombre: "Centro",
      lugarId,
    });
    const repositorioDeLugares = (): RepositorioDeZonasPorId => ({
      buscarPorId: vi.fn().mockResolvedValue(asentamiento),
    });

    await expect(
      crearAltaDeZona(repositorio, repositorioDeLugares())(
        { nombre: "Centro", lugarId },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NombreDeZonaDuplicadoError);
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it("crea la zona y deja bitacora de ids", async () => {
    const repositorio = repositorioDeZonas();
    const repositorioDeLugares = (): RepositorioDeZonasPorId => ({
      buscarPorId: vi.fn().mockResolvedValue(asentamiento),
    });

    const { id } = await crearAltaDeZona(repositorio, repositorioDeLugares())(
      { nombre: "Centro", lugarId },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.crear).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id,
        lugarId,
        nombre: "Centro",
        ayuntamientoId: "motul",
      }),
    );
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "ALTA_ZONA",
        entidad: "zonas",
        entidadId: id,
      }),
    );
  });
});
