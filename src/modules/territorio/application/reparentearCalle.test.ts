import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import {
  CalleConDomiciliosError,
  CatalogoDeCallesSoloEnAsentamientosError,
  comoCalleId,
  comoLugarId,
  type PuntoGeografico,
} from "../domain";
import type {
  CalleGuardada,
  RepositorioDeCalles,
  RepositorioDeLugares,
} from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const publicarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

vi.mock("@/shared/notificaciones/notificar", () => ({
  publicarActualizacion: publicarMock,
}));

const { crearReparentearCalle } = await import("./reparentearCalle");

const calleId = comoCalleId("11111111-1111-4111-8111-111111111111");
const lugarActualId = comoLugarId("22222222-2222-4222-8222-222222222222");
const destinoId = comoLugarId("33333333-3333-4333-8333-333333333333");
const punto: PuntoGeografico = { latitud: 20.937, longitud: -89.6237 };

const calleGuardada: CalleGuardada = {
  id: calleId,
  nombre: "Calle Veintiuno",
  lugarId: lugarActualId,
  punto,
  bajaEn: null,
};

const repositorioDeCalles = (): RepositorioDeCalles => ({
  crear: vi.fn(),
  buscarPorId: vi.fn(),
  bloquearPorId: vi.fn(),
  actualizar: vi.fn(),
  contarDomiciliosQueLaUsan: vi.fn(),
  contarZonasQueLaUsan: vi.fn().mockResolvedValue(0),
  listarPorLugar: vi.fn(),
  registrarEventoDeAlta: vi.fn(),
  registrarEventoDeRenombre: vi.fn(),
  registrarEventoDeReparenteo: vi.fn(),
  registrarEventoDeUbicacion: vi.fn(),
});

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

const lugarPorDefecto = {
  id: destinoId,
  tipo: "cabecera" as const,
  nombre: "Sector nuevo",
  padreId: null,
  bajaEn: null,
};

const reparentear = (
  repositorio: RepositorioDeCalles,
  rol: ContextoActual["usuario"]["rol"] = "ADMIN_MUNICIPAL",
) =>
  crearReparentearCalle(repositorio, repositorioDeLugares)(calleId, destinoId, {
    ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
    usuario: { id: "usuario-1", rol },
    origen: "web",
  });

describe("reparentear calles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorioDeLugares.buscarPorId).mockResolvedValue(
      lugarPorDefecto,
    );
  });

  it("reparentear conserva el punto y rechaza un destino ajeno o inexistente", async () => {
    const repositorio = repositorioDeCalles();
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(calleGuardada);
    vi.mocked(repositorioDeLugares.buscarPorId).mockResolvedValue(null);

    await expect(reparentear(repositorio)).rejects.toBeInstanceOf(
      NoEncontradoError,
    );

    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(repositorio.registrarEventoDeReparenteo).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
    expect(publicarMock).not.toHaveBeenCalled();
  });

  it("rechaza un rol no autorizado sin abrir transaccion ni escribir", async () => {
    const repositorio = repositorioDeCalles();

    await expect(reparentear(repositorio, "OPERADOR")).rejects.toBeInstanceOf(
      NoAutorizadoError,
    );

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(repositorio.registrarEventoDeReparenteo).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
    expect(publicarMock).not.toHaveBeenCalled();
  });

  for (const tipo of ["colonia", "sector", "manzana"] as const) {
    it(`rechaza mover una calle bajo ${tipo} antes de actualizar`, async () => {
      const repositorio = repositorioDeCalles();
      vi.mocked(repositorio.bloquearPorId).mockResolvedValue(calleGuardada);
      vi.mocked(repositorioDeLugares.buscarPorId).mockResolvedValue({
        ...lugarPorDefecto,
        tipo,
      });

      await expect(reparentear(repositorio)).rejects.toBeInstanceOf(
        CatalogoDeCallesSoloEnAsentamientosError,
      );

      expect(repositorio.actualizar).not.toHaveBeenCalled();
    });
  }

  it("rechaza mover a otro asentamiento una calle con domicilios colgados", async () => {
    const repositorio = repositorioDeCalles();
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(calleGuardada);
    vi.mocked(repositorio.contarDomiciliosQueLaUsan).mockResolvedValue(1);

    await expect(reparentear(repositorio)).rejects.toBeInstanceOf(
      CalleConDomiciliosError,
    );

    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(repositorio.registrarEventoDeReparenteo).not.toHaveBeenCalled();
  });

  it("reparentear escribe solo la calle y registra la accion", async () => {
    const repositorio = repositorioDeCalles();
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(calleGuardada);
    vi.mocked(repositorio.contarDomiciliosQueLaUsan).mockResolvedValue(0);
    vi.mocked(repositorio.actualizar).mockResolvedValue({
      ...calleGuardada,
      lugarId: destinoId,
    });

    await reparentear(repositorio);

    const tx = vi.mocked(repositorio.actualizar).mock.calls[0]?.[0];
    expect(repositorio.actualizar).toHaveBeenCalledWith(tx, {
      id: calleId,
      nombre: calleGuardada.nombre,
      lugarId: destinoId,
      punto,
      bajaEn: null,
    });
    expect(repositorio.registrarEventoDeReparenteo).toHaveBeenCalledWith(tx, {
      ayuntamientoId: "motul",
      calleId,
    });
    expect(repositorio.registrarEventoDeAlta).not.toHaveBeenCalled();
    expect(repositorio.registrarEventoDeRenombre).not.toHaveBeenCalled();
    expect(repositorio.registrarEventoDeUbicacion).not.toHaveBeenCalled();
    expect(publicarMock).toHaveBeenCalledWith(tx, "motul", {
      tipo: "calle",
      id: calleId,
      cambio: "estructura",
    });
    expect(registrarMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        accion: "REPARENTEAR_CALLE",
        entidadId: calleId,
      }),
    );
  });
});
