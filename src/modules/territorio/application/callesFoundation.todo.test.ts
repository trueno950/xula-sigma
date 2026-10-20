import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";
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
const lugarActualId = comoLugarId("22222222-2222-4222-8222-222222222222");
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

describe("casos de uso de calles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("ubica y redondea el punto, y deja bitacora en la misma transaccion", async () => {
    const repositorio = repositorioDeCalles();
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(calleGuardada);
    vi.mocked(repositorio.actualizar).mockResolvedValue(calleGuardada);

    await crearUbicarCalle(repositorio)(
      calleId,
      { latitud: 20.9370004, longitud: -89.6237004 },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    const tx = vi.mocked(repositorio.actualizar).mock.calls[0]?.[0];
    expect(repositorio.actualizar).toHaveBeenCalledWith(tx, {
      id: calleId,
      nombre: calleGuardada.nombre,
      lugarId: lugarActualId,
      punto,
      bajaEn: null,
    });
    expect(repositorio.registrarEventoDeUbicacion).toHaveBeenCalledWith(tx, {
      ayuntamientoId: "motul",
      calleId,
      puntoAnterior: punto,
      puntoNuevo: punto,
    });
    expect(publicarMock).toHaveBeenCalledWith(tx, "motul", {
      tipo: "calle",
      id: calleId,
      cambio: "estructura",
    });
    expect(repositorio.registrarEventoDeAlta).not.toHaveBeenCalled();
    expect(repositorio.registrarEventoDeRenombre).not.toHaveBeenCalled();
    expect(repositorio.registrarEventoDeReparenteo).not.toHaveBeenCalled();
    expect(registrarMock).toHaveBeenCalledWith(tx, {
      ayuntamientoId: "motul",
      actor: "usuario-1",
      origen: "web",
      accion: "UBICAR_CALLE",
      entidad: "calles",
      entidadId: calleId,
    });
  });

  it("rechaza ubicar sin permiso y no abre transaccion", async () => {
    const repositorio = repositorioDeCalles();

    await expect(
      crearUbicarCalle(repositorio)(calleId, punto, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(repositorio.registrarEventoDeUbicacion).not.toHaveBeenCalled();
    expect(publicarMock).not.toHaveBeenCalled();
  });

  it("rechaza un punto fuera de Yucatan y no escribe la calle", async () => {
    const repositorio = repositorioDeCalles();

    await expect(
      crearUbicarCalle(repositorio)(
        calleId,
        { latitud: 30, longitud: -89.6237 },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(PuntoFueraDeYucatanError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });
});
