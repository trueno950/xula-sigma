import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { comoLugarId } from "../domain";
import { LugarConDependientesError } from "../domain/errores";
import type { RepositorioDeLugares } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearDarDeBajaLugar } = await import("./darDeBajaLugar");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const coloniaId = comoLugarId("11111111-1111-4111-8111-111111111111");

describe("darDeBajaLugar", () => {
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
    vi.mocked(repositorio.buscarPorId).mockResolvedValue({
      id: coloniaId,
      tipo: "colonia",
      nombre: "Colonia 3",
      padreId: null,
      bajaEn: null,
    });
    vi.mocked(repositorio.contarHijosActivos).mockResolvedValue(0);
    vi.mocked(repositorio.contarDomiciliosColgados).mockResolvedValue(0);
  });

  it("rechaza sin puedeEscribir y no abre transaccion ni escribe", async () => {
    const darDeBajaLugar = crearDarDeBajaLugar(repositorio);

    await expect(
      darDeBajaLugar(coloniaId, contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("rechaza si el lugar no existe", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const darDeBajaLugar = crearDarDeBajaLugar(repositorio);

    await expect(
      darDeBajaLugar(coloniaId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("rechaza si tiene hijos activos", async () => {
    vi.mocked(repositorio.contarHijosActivos).mockResolvedValue(1);
    const darDeBajaLugar = crearDarDeBajaLugar(repositorio);

    await expect(
      darDeBajaLugar(coloniaId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(LugarConDependientesError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza si tiene domicilios colgados", async () => {
    vi.mocked(repositorio.contarDomiciliosColgados).mockResolvedValue(1);
    const darDeBajaLugar = crearDarDeBajaLugar(repositorio);

    await expect(
      darDeBajaLugar(coloniaId, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(LugarConDependientesError);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });

  it("rechaza con un mensaje que el operador puede accionar, no con jerga del esquema", async () => {
    vi.mocked(repositorio.contarHijosActivos).mockResolvedValue(1);
    const darDeBajaLugar = crearDarDeBajaLugar(repositorio);

    const error = await darDeBajaLugar(
      coloniaId,
      contextoCon("OPERADOR"),
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(LugarConDependientesError);
    const mensaje = (error as LugarConDependientesError).message;
    // "hijos activos" y "colgados" son vocabulario de esquema: la operadora
    // municipal no tiene como saber que significan ni que hacer con ellos.
    expect(mensaje).not.toContain("colgados");
    expect(mensaje).toContain("adentro");
  });

  it("sin hijos activos ni domicilios colgados, marca la baja", async () => {
    const darDeBajaLugar = crearDarDeBajaLugar(repositorio);

    await darDeBajaLugar(coloniaId, contextoCon("OPERADOR"));

    expect(repositorio.actualizar).toHaveBeenCalledWith(expect.anything(), {
      id: coloniaId,
      nombre: "Colonia 3",
      padreId: null,
      bajaEn: expect.any(Date),
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ accion: "BAJA_LUGAR", entidadId: coloniaId }),
    );
  });
});
