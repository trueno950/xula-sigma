import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "@/shared/lib/errores";
import {
  comoIntervencionId,
  IntervencionCerradaError,
  TransicionInvalidaError,
} from "../domain";
import type {
  IntervencionGuardada,
  RepositorioDeIntervenciones,
} from "./puertos";

const tx = {};
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));

const { crearCambiarEstadoDeIntervencion } = await import(
  "./cambiarEstadoDeIntervencion"
);

const contexto = (rol: ContextoActual["usuario"]["rol"]): ContextoActual => ({
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const entrada = {
  id: "33333333-3333-4333-8333-333333333333",
  estadoNuevo: "EN_EJECUCION" as const,
};

const guardada = (estado: IntervencionGuardada["estado"]) =>
  ({ id: comoIntervencionId(entrada.id), estado }) as IntervencionGuardada;

describe("cambiarEstadoDeIntervencion", () => {
  const repositorio: Pick<
    RepositorioDeIntervenciones,
    "buscarPorId" | "aplicarTransicion"
  > = {
    buscarPorId: vi.fn(),
    aplicarTransicion: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (actualTx: unknown) => unknown) => trabajo(tx),
    );
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      guardada("PLANIFICADA"),
    );
    vi.mocked(repositorio.aplicarTransicion).mockResolvedValue(true);
  });

  const cambiar = () => crearCambiarEstadoDeIntervencion({ repositorio });

  it.each([
    ["PLANIFICADA", "EN_EJECUCION"],
    ["PLANIFICADA", "CANCELADA"],
    ["EN_EJECUCION", "FINALIZADA"],
    ["EN_EJECUCION", "CANCELADA"],
  ] as const)("aplica %s -> %s y audita por ids", async (desde, hacia) => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardada(desde));

    await cambiar()(
      { id: entrada.id, estadoNuevo: hacia },
      contexto("ADMIN_MUNICIPAL"),
    );

    expect(repositorio.aplicarTransicion).toHaveBeenCalledWith(tx, {
      id: entrada.id,
      estadoAnterior: desde,
      estadoNuevo: hacia,
    });
    expect(registrarMock).toHaveBeenCalledWith(tx, {
      ayuntamientoId: contexto("ADMIN_MUNICIPAL").ayuntamientoId,
      actor: "usuario-1",
      origen: "web",
      accion: "CAMBIAR_ESTADO_INTERVENCION",
      entidad: "intervenciones",
      entidadId: entrada.id,
    });
    expect(registrarMock.mock.calls[0]?.[1]).not.toHaveProperty("estadoNuevo");
  });

  it.each(["FINALIZADA", "CANCELADA"] as const)(
    "rechaza cualquier reapertura desde %s",
    async (estado) => {
      vi.mocked(repositorio.buscarPorId).mockResolvedValue(guardada(estado));

      await expect(
        cambiar()(entrada, contexto("ADMIN_MUNICIPAL")),
      ).rejects.toBeInstanceOf(IntervencionCerradaError);
      expect(repositorio.aplicarTransicion).not.toHaveBeenCalled();
      expect(registrarMock).not.toHaveBeenCalled();
    },
  );

  it("rechaza una transicion fuera de la tabla", async () => {
    await expect(
      cambiar()(
        { id: entrada.id, estadoNuevo: "FINALIZADA" },
        contexto("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(TransicionInvalidaError);
  });

  it("niega roles no administradores antes de abrir transaccion", async () => {
    for (const rol of ["OPERADOR", "CONSULTA", "SUPER_ADMIN"] as const) {
      await expect(cambiar()(entrada, contexto(rol))).rejects.toBeInstanceOf(
        NoAutorizadoError,
      );
    }
    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("valida el borde estricto y traduce una fila invisible a 404", async () => {
    await expect(
      cambiar()(
        { ...entrada, ayuntamientoId: "99999999-9999-4999-8999-999999999999" },
        contexto("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(ValidacionError);
    await expect(
      cambiar()(
        { ...entrada, estadoNuevo: "DESCONOCIDO" },
        contexto("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(ValidacionError);

    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    await expect(
      cambiar()(entrada, contexto("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(NoEncontradoError);
    expect(withTenantMock).toHaveBeenCalledWith(
      contexto("ADMIN_MUNICIPAL").ayuntamientoId,
      expect.any(Function),
    );
    expect(repositorio.aplicarTransicion).not.toHaveBeenCalled();
  });
});
