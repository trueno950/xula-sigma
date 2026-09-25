import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import {
  comoIntervencionId,
  IntervencionCerradaError,
  TransicionInvalidaError,
} from "../domain";
import type { IntervencionGuardada } from "./puertos";

/**
 * Cada caso de uso de `intervenciones` que muta publica su `{ tipo:
 * "intervencion", id, cambio }` (D1/D2 de `mapa-operativo-territorial`)
 * dentro del `tx` de `withTenant` y como ultimo paso: si algo antes falla,
 * no hay nada que publicar. La entrega real -al COMMIT, solo al tenant
 * dueño- se prueba en `notificacionDeIntervenciones.integration.test.ts`.
 */
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const publicarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));
vi.mock("@/shared/notificaciones/notificar", () => ({
  publicarActualizacion: publicarMock,
}));

const { crearCambiarEstadoDeIntervencion } = await import(
  "./cambiarEstadoDeIntervencion"
);
const { crearCorregirIntervencion } = await import("./corregirIntervencion");

const tx = { marca: "tx-del-caso-de-uso" };
const ayuntamientoId =
  "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"];
const intervencionId = "33333333-3333-4333-8333-333333333333";
const lugarId = "22222222-2222-4222-8222-222222222222";

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId,
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const despuesDe = (anterior: Mock, posterior: Mock) =>
  expect(anterior.mock.invocationCallOrder[0]).toBeLessThan(
    posterior.mock.invocationCallOrder[0] as number,
  );

const lecturaDeUbicaciones = () => ({
  de: vi.fn().mockResolvedValue({ texto: "Centro" }),
});

beforeEach(() => {
  vi.resetAllMocks();
  withTenantMock.mockImplementation(
    (_id: unknown, trabajo: (actual: unknown) => unknown) => trabajo(tx),
  );
});

describe("cambiarEstadoDeIntervencion publica el estado", () => {
  const repositorio = { buscarPorId: vi.fn(), aplicarTransicion: vi.fn() };
  const cambiarEstado = crearCambiarEstadoDeIntervencion({ repositorio });
  const guardada = (estado: IntervencionGuardada["estado"]) =>
    ({
      id: comoIntervencionId(intervencionId),
      estado,
    }) as IntervencionGuardada;

  it("publica {intervencion, id, estado} en el tx, despues de transicionar y auditar", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardada("PLANIFICADA"));
    repositorio.aplicarTransicion.mockResolvedValue(true);

    await cambiarEstado(
      { id: intervencionId, estadoNuevo: "EN_EJECUCION" },
      contextoCon("ADMIN_MUNICIPAL"),
    );

    expect(publicarMock).toHaveBeenCalledTimes(1);
    expect(publicarMock).toHaveBeenCalledWith(tx, ayuntamientoId, {
      tipo: "intervencion",
      id: intervencionId,
      cambio: "estado",
    });
    despuesDe(repositorio.aplicarTransicion, publicarMock);
    despuesDe(registrarMock, publicarMock);
  });

  it.each([
    {
      caso: "transicion invalida",
      actual: "PLANIFICADA",
      estadoNuevo: "FINALIZADA",
      error: TransicionInvalidaError,
    },
    {
      caso: "intervencion cerrada",
      actual: "CANCELADA",
      estadoNuevo: "EN_EJECUCION",
      error: IntervencionCerradaError,
    },
  ] as const)(
    "no publica ante $caso",
    async ({ actual, estadoNuevo, error }) => {
      repositorio.buscarPorId.mockResolvedValue(guardada(actual));

      await expect(
        cambiarEstado(
          { id: intervencionId, estadoNuevo },
          contextoCon("ADMIN_MUNICIPAL"),
        ),
      ).rejects.toBeInstanceOf(error);

      expect(publicarMock).not.toHaveBeenCalled();
    },
  );

  it("no publica si otra transaccion ya movio la intervencion", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardada("PLANIFICADA"));
    repositorio.aplicarTransicion.mockResolvedValue(false);

    await expect(
      cambiarEstado(
        { id: intervencionId, estadoNuevo: "EN_EJECUCION" },
        contextoCon("ADMIN_MUNICIPAL"),
      ),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(publicarMock).not.toHaveBeenCalled();
  });
});

describe("corregirIntervencion publica la correccion", () => {
  const repositorio = { corregir: vi.fn() };
  const corregir = crearCorregirIntervencion({
    repositorio,
    crearLecturaDeUbicaciones: lecturaDeUbicaciones,
    crearLecturaDeReportes: () => ({ porId: vi.fn() }),
  });
  const entrada = {
    id: intervencionId,
    tipo: "MEJORA" as const,
    fechaDeOcurrencia: "2026-02-20",
    lugarId,
    calleId: null,
    reporteId: null,
    descripcion: "Rehabilitacion del parque municipal",
  };

  it("publica {intervencion, id, correccion} en el tx, despues de corregir y auditar", async () => {
    repositorio.corregir.mockResolvedValue(true);

    await corregir(entrada, contextoCon("ADMIN_MUNICIPAL"));

    expect(publicarMock).toHaveBeenCalledTimes(1);
    expect(publicarMock).toHaveBeenCalledWith(tx, ayuntamientoId, {
      tipo: "intervencion",
      id: intervencionId,
      cambio: "correccion",
    });
    despuesDe(repositorio.corregir, publicarMock);
    despuesDe(registrarMock, publicarMock);
  });

  it("no publica si la fila no es visible para el tenant", async () => {
    repositorio.corregir.mockResolvedValue(false);

    await expect(
      corregir(entrada, contextoCon("ADMIN_MUNICIPAL")),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(publicarMock).not.toHaveBeenCalled();
  });

  it("sin puedeAdministrarIntervenciones no publica", async () => {
    await expect(
      corregir(entrada, contextoCon("OPERADOR")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(publicarMock).not.toHaveBeenCalled();
  });
});
