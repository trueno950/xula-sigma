import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";

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

const { crearRegistrarIntervencion } = await import("./registrarIntervencion");

const tx = { marca: "tx-del-caso-de-uso" };
const ayuntamientoId =
  "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"];
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

describe("registrarIntervencion publica el alta", () => {
  const repositorio = { guardar: vi.fn() };
  const registrar = crearRegistrarIntervencion({
    repositorio,
    crearLecturaDeUbicaciones: lecturaDeUbicaciones,
    crearLecturaDeReportes: () => ({ porId: vi.fn() }),
  });
  const entrada = {
    tipo: "OBRA" as const,
    fechaDeOcurrencia: "2026-01-15",
    lugarId,
    calleId: null,
    reporteId: null,
    descripcion: "Rehabilitacion del parque municipal",
  };

  it("publica {intervencion, id guardado, alta} en el tx, despues de guardar y auditar", async () => {
    const id = await registrar(entrada, contextoCon("OPERADOR"));

    expect(publicarMock).toHaveBeenCalledTimes(1);
    expect(publicarMock).toHaveBeenCalledWith(tx, ayuntamientoId, {
      tipo: "intervencion",
      id,
      cambio: "alta",
    });
    expect(repositorio.guardar.mock.calls[0]?.[1].id).toBe(id);
    despuesDe(repositorio.guardar, publicarMock);
    despuesDe(registrarMock, publicarMock);
  });

  it("si la traza falla, la transaccion se revierte sin publicar", async () => {
    registrarMock.mockRejectedValue(new Error("falla la bitacora"));

    await expect(registrar(entrada, contextoCon("OPERADOR"))).rejects.toThrow(
      "falla la bitacora",
    );

    expect(publicarMock).not.toHaveBeenCalled();
  });

  it("sin puedeEscribir no publica", async () => {
    await expect(
      registrar(entrada, contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(publicarMock).not.toHaveBeenCalled();
  });
});
