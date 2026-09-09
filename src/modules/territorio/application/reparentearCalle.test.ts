import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoCalleId, comoLugarId, type PuntoGeografico } from "../domain";
import type {
  CalleGuardada,
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

const { crearReparentearCalle } = await import("./reparentearCalle");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

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
  listarPorLugar: vi.fn(),
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

describe("reparentear calles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorioDeLugares.buscarPorId).mockResolvedValue({
      id: destinoId,
      tipo: "sector",
      nombre: "Sector nuevo",
      padreId: null,
      bajaEn: null,
    });
  });

  it("reparentear conserva el punto y rechaza un destino ajeno o inexistente", async () => {
    const repositorio = repositorioDeCalles();
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(calleGuardada);
    vi.mocked(repositorioDeLugares.buscarPorId).mockResolvedValue(null);

    await expect(
      crearReparentearCalle(repositorio, repositorioDeLugares)(
        calleId,
        destinoId,
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("rechaza un rol no autorizado sin abrir transaccion ni escribir", async () => {
    const repositorio = repositorioDeCalles();

    await expect(
      crearReparentearCalle(repositorio, repositorioDeLugares)(
        calleId,
        destinoId,
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("reparentear escribe solo la calle y registra la accion", async () => {
    const repositorio = repositorioDeCalles();
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(calleGuardada);
    vi.mocked(repositorio.actualizar).mockResolvedValue({
      ...calleGuardada,
      lugarId: destinoId,
    });

    await crearReparentearCalle(repositorio, repositorioDeLugares)(
      calleId,
      destinoId,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    const tx = vi.mocked(repositorio.actualizar).mock.calls[0]?.[0];
    expect(repositorio.actualizar).toHaveBeenCalledWith(tx, {
      id: calleId,
      nombre: calleGuardada.nombre,
      lugarId: destinoId,
      punto,
      bajaEn: null,
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
