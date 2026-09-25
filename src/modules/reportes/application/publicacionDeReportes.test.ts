import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";

/**
 * Cada caso de uso de `reportes` que muta publica su `{ tipo: "reporte",
 * id, cambio }` (D1/D2 de `mapa-operativo-territorial`) dentro del `tx` de
 * `withTenant` y como ultimo paso: si algo antes falla, no hay nada que
 * publicar. La entrega real -al COMMIT, solo al tenant dueño- se prueba en
 * `notificacionDeReportes.integration.test.ts`. El estado y el area viven en
 * `publicacionDeReportes.transiciones.test.ts` -mismo limite de 200 lineas
 * que separa este archivo en dos-.
 */
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const publicarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));
vi.mock("@/shared/notificaciones/notificar", () => ({
  publicarActualizacion: publicarMock,
}));

const { crearRegistrarReporte } = await import("./registrarReporte");

const tx = { marca: "tx-del-caso-de-uso" };
const ayuntamientoId =
  "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"];

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

beforeEach(() => {
  vi.resetAllMocks();
  withTenantMock.mockImplementation(
    (_id: unknown, trabajo: (actual: unknown) => unknown) => trabajo(tx),
  );
});

describe("registrarReporte publica el alta", () => {
  const repositorio = { guardar: vi.fn() };
  const movimientos = { agregar: vi.fn(), historialDe: vi.fn() };
  const contador = { siguiente: vi.fn() };
  const registrarReporte = crearRegistrarReporte({
    repositorio,
    contador,
    movimientos,
    crearLecturaDeUbicaciones: () => ({
      de: vi.fn().mockResolvedValue({ texto: "Calle 20" }),
    }),
    crearLecturaDeReportantes: () => ({ porId: vi.fn() }),
  });
  const entrada = {
    tipo: "BACHE" as const,
    lugarId: "33333333-3333-4333-8333-333333333333",
    calleId: null,
    referencia: null,
    descripcion: "Bache grande frente al parque principal",
    personaId: null,
  };

  beforeEach(() => {
    contador.siguiente.mockResolvedValue(1);
  });

  it("publica {reporte, id guardado, alta} en el tx, despues de guardar y auditar", async () => {
    const id = await registrarReporte(entrada, contextoCon("OPERADOR"));

    expect(publicarMock).toHaveBeenCalledTimes(1);
    expect(publicarMock).toHaveBeenCalledWith(tx, ayuntamientoId, {
      tipo: "reporte",
      id,
      cambio: "alta",
    });
    expect(repositorio.guardar.mock.calls[0]?.[1].id).toBe(id);
    despuesDe(repositorio.guardar, publicarMock);
    despuesDe(movimientos.agregar, publicarMock);
    despuesDe(registrarMock, publicarMock);
  });

  it("si la traza falla, la transaccion se revierte sin publicar", async () => {
    registrarMock.mockRejectedValue(new Error("falla la bitacora"));

    await expect(
      registrarReporte(entrada, contextoCon("OPERADOR")),
    ).rejects.toThrow("falla la bitacora");

    expect(publicarMock).not.toHaveBeenCalled();
  });

  it("sin puedeEscribir no publica", async () => {
    await expect(
      registrarReporte(entrada, contextoCon("CONSULTA")),
    ).rejects.toBeInstanceOf(NoAutorizadoError);

    expect(publicarMock).not.toHaveBeenCalled();
  });
});
