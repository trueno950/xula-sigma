import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoLugarId, JerarquiaInvalidaError } from "../domain";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearAltaDeLugar } = await import("./altaDeLugar");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const comisariaId = comoLugarId("11111111-1111-4111-8111-111111111111");
const cabeceraId = comoLugarId("22222222-2222-4222-8222-222222222222");

const comisariaGuardada: LugarGuardado = {
  id: comisariaId,
  tipo: "comisaria",
  nombre: "Dzununcan",
  padreId: null,
  bajaEn: null,
};

describe("altaDeLugar", () => {
  const repositorio: RepositorioDeLugares = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    actualizar: vi.fn(),
    contarHijosActivos: vi.fn(),
    contarDomiciliosColgados: vi.fn(),
    subarbol: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("rechaza sin puedeEscribir y no abre transaccion ni escribe", async () => {
    const altaDeLugar = crearAltaDeLugar(repositorio);

    await expect(
      altaDeLugar(
        { tipo: "sector", nombre: "Sector 3", padreId: comisariaId },
        contextoCon("CONSULTA"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("un sector cuyo padre es una comisaria sin colonias se crea sin fila de relleno", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(comisariaGuardada);
    const altaDeLugar = crearAltaDeLugar(repositorio);

    const resultado = await altaDeLugar(
      { tipo: "sector", nombre: "Sector 3", padreId: comisariaId },
      contextoCon("OPERADOR"),
    );

    expect(repositorio.crear).toHaveBeenCalledTimes(1);
    expect(repositorio.crear).toHaveBeenCalledWith(expect.anything(), {
      id: resultado.id,
      ayuntamientoId: "motul",
      tipo: "sector",
      nombre: "Sector 3",
      padreId: comisariaId,
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ayuntamientoId: "motul",
        actor: "usuario-1",
        origen: "web",
        accion: "ALTA_LUGAR",
        entidad: "lugares",
        entidadId: resultado.id,
      }),
    );
  });

  it("padreId = null crea una raiz sin leer ningun padre", async () => {
    const altaDeLugar = crearAltaDeLugar(repositorio);

    await altaDeLugar(
      { tipo: "cabecera", nombre: "Motul", padreId: null },
      contextoCon("OPERADOR"),
    );

    expect(repositorio.buscarPorId).not.toHaveBeenCalled();
    expect(repositorio.crear).toHaveBeenCalledTimes(1);
  });

  it("rechaza si el padre no existe", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const altaDeLugar = crearAltaDeLugar(repositorio);

    await expect(
      altaDeLugar(
        { tipo: "sector", nombre: "Sector 3", padreId: comisariaId },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it("rechaza una comisaria cuyo padre es una cabecera (mismo rango)", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue({
      id: cabeceraId,
      tipo: "cabecera",
      nombre: "Motul",
      padreId: null,
      bajaEn: null,
    });
    const altaDeLugar = crearAltaDeLugar(repositorio);

    await expect(
      altaDeLugar(
        { tipo: "comisaria", nombre: "Dzununcan", padreId: cabeceraId },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(JerarquiaInvalidaError);

    expect(repositorio.crear).not.toHaveBeenCalled();
  });
});
