import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoLugarId, NombreDeCalleDuplicadoError } from "../domain";
import type {
  LugarGuardado,
  RepositorioDeCalles,
  RepositorioDeLugares,
} from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearAltaDeCalle } = await import("./altaDeCalle");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const comisariaId = comoLugarId("22222222-2222-4222-8222-222222222222");

const cabeceraGuardada: LugarGuardado = {
  id: cabeceraId,
  tipo: "cabecera",
  nombre: "Motul",
  padreId: null,
  bajaEn: null,
};

const comisariaGuardada: LugarGuardado = {
  id: comisariaId,
  tipo: "comisaria",
  nombre: "Dzununcan",
  padreId: cabeceraId,
  bajaEn: null,
};

describe("altaDeCalle", () => {
  const repositorio: RepositorioDeCalles = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    actualizar: vi.fn(),
    contarDomiciliosQueLaUsan: vi.fn(),
    listarPorLugar: vi.fn(),
  };
  const repositorioDeLugares: RepositorioDeLugares = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    actualizar: vi.fn(),
    contarHijosActivos: vi.fn(),
    contarDomiciliosColgados: vi.fn(),
    subarbol: vi.fn(),
    listarRaices: vi.fn(),
    listarLugares: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorioDeLugares.buscarPorId).mockResolvedValue(
      cabeceraGuardada,
    );
  });

  it("rechaza sin puedeAdministrarTerritorio y no abre transaccion ni escribe", async () => {
    const altaDeCalle = crearAltaDeCalle(repositorio, repositorioDeLugares);

    await expect(
      altaDeCalle(
        { nombre: "Calle 21", lugarId: cabeceraId },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("rechaza como si no existiera un lugarId de otro tenant o inexistente", async () => {
    vi.mocked(repositorioDeLugares.buscarPorId).mockResolvedValue(null);
    const altaDeCalle = crearAltaDeCalle(repositorio, repositorioDeLugares);

    await expect(
      altaDeCalle(
        { nombre: "Calle 21", lugarId: cabeceraId },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("propaga NombreDeCalleDuplicadoError del repositorio sin envolverla", async () => {
    vi.mocked(repositorio.crear).mockRejectedValue(
      new NombreDeCalleDuplicadoError(),
    );
    const altaDeCalle = crearAltaDeCalle(repositorio, repositorioDeLugares);

    await expect(
      altaDeCalle(
        { nombre: "Calle 21", lugarId: cabeceraId },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NombreDeCalleDuplicadoError);

    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("una Calle 21 de la cabecera y otra de una comisaria distinta conviven", async () => {
    const altaDeCalle = crearAltaDeCalle(repositorio, repositorioDeLugares);

    const dela = await altaDeCalle(
      { nombre: "Calle 21", lugarId: cabeceraId },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    vi.mocked(repositorioDeLugares.buscarPorId).mockResolvedValue(
      comisariaGuardada,
    );
    const delaOtra = await altaDeCalle(
      { nombre: "Calle 21", lugarId: comisariaId },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.crear).toHaveBeenCalledTimes(2);
    expect(repositorio.crear).toHaveBeenNthCalledWith(1, expect.anything(), {
      id: dela.id,
      ayuntamientoId: "motul",
      nombre: "Calle 21",
      lugarId: cabeceraId,
    });
    expect(repositorio.crear).toHaveBeenNthCalledWith(2, expect.anything(), {
      id: delaOtra.id,
      ayuntamientoId: "motul",
      nombre: "Calle 21",
      lugarId: comisariaId,
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ayuntamientoId: "motul",
        actor: "usuario-1",
        origen: "web",
        accion: "ALTA_CALLE",
        entidad: "calles",
        entidadId: dela.id,
      }),
    );
  });
});
