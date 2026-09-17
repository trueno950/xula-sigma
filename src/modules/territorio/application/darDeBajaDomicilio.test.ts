import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import {
  comoCalleId,
  comoDomicilioId,
  comoLugarId,
  DomicilioConResidentesError,
} from "../domain";
import type { RepositorioDeDomicilios } from "./puertosDeDomicilios";
import type { RepositorioDeResidencias } from "./puertosDeResidencias";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearDarDeBajaDomicilio } = await import("./darDeBajaDomicilio");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const lugarId = comoLugarId("11111111-1111-4111-8111-111111111111");
const domicilioId = comoDomicilioId("22222222-2222-4222-8222-222222222222");
const calleId = comoCalleId("33333333-3333-4333-8333-333333333333");

const guardado = {
  id: domicilioId,
  lugarId,
  calleId,
  numero: "21",
  entreCalleAId: null,
  entreCalleBId: null,
  referencia: null,
  bajaEn: null,
};

describe("darDeBajaDomicilio", () => {
  const repositorio: RepositorioDeDomicilios = {
    crear: vi.fn(),
    buscarPorId: vi.fn(),
    bloquearPorId: vi.fn(),
    actualizar: vi.fn(),
    porLugarYSubarbol: vi.fn(),
    porCalle: vi.fn(),
    listar: vi.fn(),
  };
  const repositorioDeResidencias: RepositorioDeResidencias = {
    cerrarAbierta: vi.fn(),
    abrir: vi.fn(),
    historialDe: vi.fn(),
    residentesDe: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(guardado);
    vi.mocked(repositorio.actualizar).mockResolvedValue({
      ...guardado,
      bajaEn: new Date("2026-01-01T00:00:00.000Z"),
    });
    vi.mocked(repositorioDeResidencias.residentesDe).mockResolvedValue([]);
  });

  const darDeBaja = () =>
    crearDarDeBajaDomicilio(repositorio, repositorioDeResidencias);

  it("rechaza sin puedeEscribir y no abre transaccion", async () => {
    await expect(
      darDeBaja()(domicilioId, contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza un domicilio ajeno o inexistente como si no existiera", async () => {
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue(null);

    await expect(
      darDeBaja()(domicilioId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza una segunda baja como si no existiera", async () => {
    vi.mocked(repositorio.bloquearPorId).mockResolvedValue({
      ...guardado,
      bajaEn: new Date("2026-01-01T00:00:00.000Z"),
    });

    await expect(
      darDeBaja()(domicilioId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("rechaza la baja si hay una residencia vigente", async () => {
    vi.mocked(repositorioDeResidencias.residentesDe).mockResolvedValue([
      "persona-1",
    ]);

    await expect(
      darDeBaja()(domicilioId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(DomicilioConResidentesError);

    expect(repositorioDeResidencias.residentesDe).toHaveBeenCalledWith(
      expect.anything(),
      [domicilioId],
    );
    expect(repositorio.actualizar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("marca la baja y registra la bitacora sin tocar residencias", async () => {
    await darDeBaja()(domicilioId, contextoCon("OPERADOR"));

    expect(repositorio.actualizar).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: domicilioId,
        bajaEn: expect.any(Date),
      }),
    );
    expect(repositorioDeResidencias.cerrarAbierta).not.toHaveBeenCalled();
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        accion: "BAJA_DOMICILIO",
        entidad: "domicilios",
        entidadId: domicilioId,
      }),
    );
  });
});
