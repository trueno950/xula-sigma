import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import {
  comoCalleId,
  comoLugarId,
  PuntoFueraDeYucatanError,
  type PuntoGeografico,
} from "../domain";
import type { CalleGuardada, RepositorioDeCalles } from "./puertos";

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

const { crearUbicarCalle } = await import("./ubicarCalle");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const calleId = comoCalleId("11111111-1111-4111-8111-111111111111");
const lugarId = comoLugarId("22222222-2222-4222-8222-222222222222");
const puntoPrevio: PuntoGeografico = { latitud: 20.937, longitud: -89.6237 };
const puntoNuevo: PuntoGeografico = { latitud: 20.94, longitud: -89.63 };

const calleConPunto: CalleGuardada = {
  id: calleId,
  nombre: "Calle 20",
  lugarId,
  punto: puntoPrevio,
  bajaEn: null,
};

describe("ubicarCalle", () => {
  const repositorio: RepositorioDeCalles = {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(calleConPunto);
    vi.mocked(repositorio.bloquearPorId).mockImplementation((_tx, id) =>
      repositorio.buscarPorId(_tx, id),
    );
  });

  it("el evento de ubicación guarda el punto anterior y el nuevo", async () => {
    vi.mocked(repositorio.actualizar).mockResolvedValue({
      ...calleConPunto,
      punto: puntoNuevo,
    });

    await crearUbicarCalle(repositorio)(
      calleId,
      puntoNuevo,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    const tx = vi.mocked(repositorio.actualizar).mock.calls[0]?.[0];
    expect(repositorio.registrarEventoDeUbicacion).toHaveBeenCalledWith(tx, {
      ayuntamientoId: "motul",
      calleId,
      puntoAnterior: puntoPrevio,
      puntoNuevo,
    });
    expect(registrarMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ accion: "UBICAR_CALLE", entidadId: calleId }),
    );
  });

  it("una calle sin punto deja el anterior nulo en vez de inventarlo", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue({
      ...calleConPunto,
      punto: null,
    });
    vi.mocked(repositorio.actualizar).mockResolvedValue({
      ...calleConPunto,
      punto: puntoNuevo,
    });

    await crearUbicarCalle(repositorio)(
      calleId,
      puntoNuevo,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.registrarEventoDeUbicacion).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ puntoAnterior: null, puntoNuevo }),
    );
  });

  it("quitar el punto deja el nuevo nulo en el evento", async () => {
    vi.mocked(repositorio.actualizar).mockResolvedValue({
      ...calleConPunto,
      punto: null,
    });

    await crearUbicarCalle(repositorio)(
      calleId,
      null,
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.registrarEventoDeUbicacion).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ puntoAnterior: puntoPrevio, puntoNuevo: null }),
    );
  });

  it("un punto fuera de Yucatán no abre transacción ni escribe", async () => {
    await expect(
      crearUbicarCalle(repositorio)(
        calleId,
        { latitud: 19.4326, longitud: -99.1332 },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(PuntoFueraDeYucatanError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(repositorio.registrarEventoDeUbicacion).not.toHaveBeenCalled();
  });

  it("rechaza un rol no autorizado sin abrir transacción ni escribir", async () => {
    await expect(
      crearUbicarCalle(repositorio)(
        calleId,
        puntoNuevo,
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("una calle de baja equivale a no encontrada", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue({
      ...calleConPunto,
      bajaEn: new Date(),
    });

    await expect(
      crearUbicarCalle(repositorio)(
        calleId,
        puntoNuevo,
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.registrarEventoDeUbicacion).not.toHaveBeenCalled();
  });
});
