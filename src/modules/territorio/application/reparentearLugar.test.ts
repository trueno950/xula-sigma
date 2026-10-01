import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoLugarId } from "../domain";
import { JerarquiaInvalidaError, RaizInvalidaError } from "../domain/errores";
import type { LugarGuardado, RepositorioDeLugares } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearReparentearLugar } = await import("./reparentearLugar");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const comisariaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const sectorId = comoLugarId("33333333-3333-4333-8333-333333333333");
const colonia = comoLugarId("44444444-4444-4444-8444-444444444444");

const lugarGuardado = (
  parcial: Partial<LugarGuardado> & Pick<LugarGuardado, "id" | "tipo">,
): LugarGuardado => ({
  nombre: "nombre",
  padreId: null,
  bajaEn: null,
  ...parcial,
});

describe("reparentearLugar", () => {
  const repositorio: RepositorioDeLugares = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    actualizar: vi.fn(),
    contarHijosActivos: vi.fn(),
    contarDomiciliosColgados: vi.fn(),
    subarbol: vi.fn(),
    listarRaices: vi.fn(),
    listarLugares: vi.fn(),
    existeCabecera: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("rechaza sin puedeAdministrarTerritorio y no abre transaccion ni escribe", async () => {
    const reparentearLugar = crearReparentearLugar(repositorio);

    await expect(
      reparentearLugar(comisariaId, cabeceraId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza si el lugar a reparentear no existe", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const reparentearLugar = crearReparentearLugar(repositorio);

    await expect(
      reparentearLugar(comisariaId, cabeceraId, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("rechaza si el nuevo padre no existe", async () => {
    vi.mocked(repositorio.buscarPorId).mockImplementation(async (_tx, id) =>
      id === comisariaId
        ? lugarGuardado({ id: comisariaId, tipo: "comisaria" })
        : null,
    );
    const reparentearLugar = crearReparentearLugar(repositorio);

    await expect(
      reparentearLugar(comisariaId, cabeceraId, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("comisaria no puede ser hija de cabecera (mismo rango)", async () => {
    vi.mocked(repositorio.buscarPorId).mockImplementation(async (_tx, id) =>
      id === comisariaId
        ? lugarGuardado({ id: comisariaId, tipo: "comisaria" })
        : lugarGuardado({ id: cabeceraId, tipo: "cabecera" }),
    );
    const reparentearLugar = crearReparentearLugar(repositorio);

    await expect(
      reparentearLugar(comisariaId, cabeceraId, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(JerarquiaInvalidaError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("un sector no puede volverse padre de su propia colonia (rango menor)", async () => {
    vi.mocked(repositorio.buscarPorId).mockImplementation(async (_tx, id) =>
      id === colonia
        ? lugarGuardado({ id: colonia, tipo: "colonia" })
        : lugarGuardado({ id: sectorId, tipo: "sector" }),
    );
    const reparentearLugar = crearReparentearLugar(repositorio);

    await expect(
      reparentearLugar(colonia, sectorId, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(JerarquiaInvalidaError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  /**
   * Este test afirmaba lo contrario -que un sector podia quedar de raiz- y
   * lo respaldaba un comentario que citaba design.md contra el spec. Por
   * que el spec gana, en la cabecera de `reparentearLugar.ts`.
   */
  it("un sector no puede quedar sin padre: solo el rango 0 es raiz", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      lugarGuardado({ id: sectorId, tipo: "sector", padreId: comisariaId }),
    );
    const reparentearLugar = crearReparentearLugar(repositorio);

    await expect(
      reparentearLugar(sectorId, null, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(RaizInvalidaError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("una comisaria si puede quedar sin padre, y no lee ningun padre", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      lugarGuardado({ id: comisariaId, tipo: "comisaria", padreId: null }),
    );
    const reparentearLugar = crearReparentearLugar(repositorio);

    await reparentearLugar(comisariaId, null, contextoCon("ADMIN_MUNICIPAL"));

    expect(repositorio.buscarPorId).toHaveBeenCalledTimes(1);
    expect(repositorio.actualizar).toHaveBeenCalledWith(expect.anything(), {
      id: comisariaId,
      nombre: "nombre",
      padreId: null,
      bajaEn: null,
    });
  });

  it("con permiso y jerarquia valida, mueve el lugar y registra solo ids", async () => {
    vi.mocked(repositorio.buscarPorId).mockImplementation(async (_tx, id) =>
      id === sectorId
        ? lugarGuardado({ id: sectorId, tipo: "sector", padreId: comisariaId })
        : lugarGuardado({ id: comisariaId, tipo: "comisaria" }),
    );
    const reparentearLugar = crearReparentearLugar(repositorio);

    await reparentearLugar(
      sectorId,
      comisariaId,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.actualizar).toHaveBeenCalledWith(expect.anything(), {
      id: sectorId,
      nombre: "nombre",
      padreId: comisariaId,
      bajaEn: null,
    });
    expect(registrarMock).toHaveBeenCalledWith(expect.anything(), {
      ayuntamientoId: "motul",
      actor: "usuario-1",
      origen: "web",
      accion: "REPARENTEAR_LUGAR",
      entidad: "lugares",
      entidadId: sectorId,
    });
  });
});
