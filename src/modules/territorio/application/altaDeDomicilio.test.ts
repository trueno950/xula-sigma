import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { comoCalleId, comoLugarId, TransversalRepetidaError } from "../domain";
import type { RepositorioDeDomicilios } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

vi.mock("@/shared/tenancy/bitacora", () => ({
  registrar: registrarMock,
}));

const { crearAltaDeDomicilio } = await import("./altaDeDomicilio");

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const lugarId = comoLugarId("11111111-1111-4111-8111-111111111111");
const calleId = comoCalleId("22222222-2222-4222-8222-222222222222");
const entreCalleAId = comoCalleId("33333333-3333-4333-8333-333333333333");
const entreCalleBId = comoCalleId("44444444-4444-4444-8444-444444444444");

describe("altaDeDomicilio", () => {
  const repositorio: RepositorioDeDomicilios = {
    crear: vi.fn(),
    porLugarYSubarbol: vi.fn(),
    porCalle: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
  });

  it("rechaza sin puedeEscribir y no abre transaccion ni escribe", async () => {
    const altaDeDomicilio = crearAltaDeDomicilio(repositorio);

    await expect(
      altaDeDomicilio(
        {
          lugarId,
          calleId,
          numero: "21",
          entreCalleAId: null,
          entreCalleBId: null,
          referencia: null,
        },
        contextoCon("CONSULTA"),
      ),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("numero ausente queda null, nunca la cadena S/N", async () => {
    const altaDeDomicilio = crearAltaDeDomicilio(repositorio);

    await altaDeDomicilio(
      {
        lugarId,
        calleId,
        numero: "",
        entreCalleAId: null,
        entreCalleBId: null,
        referencia: null,
      },
      contextoCon("OPERADOR"),
    );

    expect(repositorio.crear).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ numero: null }),
    );
  });

  it("rechaza transversal repetida antes de escribir", async () => {
    const altaDeDomicilio = crearAltaDeDomicilio(repositorio);

    await expect(
      altaDeDomicilio(
        {
          lugarId,
          calleId,
          numero: "21",
          entreCalleAId: calleId,
          entreCalleBId,
          referencia: null,
        },
        contextoCon("OPERADOR"),
      ),
    ).rejects.toBeInstanceOf(TransversalRepetidaError);

    expect(withTenantMock).not.toHaveBeenCalled();
    expect(repositorio.crear).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("da de alta con transversales distintas y registra bitacora", async () => {
    const altaDeDomicilio = crearAltaDeDomicilio(repositorio);

    const { id } = await altaDeDomicilio(
      {
        lugarId,
        calleId,
        numero: "21",
        entreCalleAId,
        entreCalleBId,
        referencia: "frente al parque",
      },
      contextoCon("OPERADOR"),
    );

    expect(repositorio.crear).toHaveBeenCalledWith(expect.anything(), {
      id,
      ayuntamientoId: "motul",
      lugarId,
      calleId,
      numero: "21",
      entreCalleAId,
      entreCalleBId,
      referencia: "frente al parque",
    });
    expect(registrarMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ayuntamientoId: "motul",
        actor: "usuario-1",
        origen: "web",
        accion: "ALTA_DOMICILIO",
        entidad: "domicilios",
        entidadId: id,
      }),
    );
  });
});
