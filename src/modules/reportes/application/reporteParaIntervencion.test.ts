import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { comoReporteId, type EstadoDeReporte } from "../domain";
import type { ReporteGuardado } from "./puertos";

const tx = { marca: "tx-de-la-transicion" } as unknown as TransaccionTenant;
const registrarMock = vi.hoisted(() => vi.fn());
const publicarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));
vi.mock("@/shared/notificaciones/notificar", () => ({
  publicarActualizacion: publicarMock,
}));

const { crearReporteParaIntervencion } = await import(
  "./reporteParaIntervencion"
);

const ayuntamientoId =
  "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"];
const reporteId = "55555555-5555-4555-8555-555555555555";

const contexto: ContextoActual = {
  ayuntamientoId,
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const guardado = (estado: EstadoDeReporte): ReporteGuardado =>
  ({
    id: comoReporteId(reporteId),
    estado,
    lugarId: "22222222-2222-4222-8222-222222222222",
    calleId: "44444444-4444-4444-8444-444444444444",
  }) as ReporteGuardado;

const repositorio = { buscarPorId: vi.fn(), aplicarTransicion: vi.fn() };
const movimientos = { agregar: vi.fn() };
const reportes = crearReporteParaIntervencion({ repositorio, movimientos });

beforeEach(() => {
  vi.clearAllMocks();
  repositorio.aplicarTransicion.mockResolvedValue(true);
});

describe("reporteParaIntervencion.leer", () => {
  it("devuelve la ubicacion y el estado del reporte, sin datos personales", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardado("RECIBIDO"));

    await expect(reportes.leer(tx, reporteId)).resolves.toEqual({
      id: reporteId,
      estado: "RECIBIDO",
      lugarId: "22222222-2222-4222-8222-222222222222",
      calleId: "44444444-4444-4444-8444-444444444444",
    });
  });

  it("un reporte de otro municipio no se ve: la lectura vuelve nula", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(reportes.leer(tx, reporteId)).resolves.toBeNull();
  });
});

describe("reporteParaIntervencion.mover", () => {
  it("mueve RECIBIDO a EN_ATENCION con su movimiento y su traza", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardado("RECIBIDO"));

    await expect(
      reportes.mover(tx, {
        reporteId,
        estadoNuevo: "EN_ATENCION",
        contexto,
      }),
    ).resolves.toBe("MOVIDO");

    expect(repositorio.aplicarTransicion).toHaveBeenCalledWith(tx, {
      id: reporteId,
      estadoAnterior: "RECIBIDO",
      estadoNuevo: "EN_ATENCION",
      motivoDeRechazo: null,
      duplicadoDeReporteId: null,
    });
    expect(movimientos.agregar).toHaveBeenCalledWith(tx, {
      ayuntamientoId,
      reporteId,
      usuarioId: "usuario-1",
      estadoAnterior: "RECIBIDO",
      estadoNuevo: "EN_ATENCION",
      areaAsignada: null,
      motivo: null,
    });
    expect(registrarMock).toHaveBeenCalledWith(tx, {
      ayuntamientoId,
      actor: "usuario-1",
      origen: "web",
      accion: "CAMBIAR_ESTADO_REPORTE",
      entidad: "reportes",
      entidadId: reporteId,
    });
    expect(publicarMock).toHaveBeenCalledWith(tx, ayuntamientoId, {
      tipo: "reporte",
      id: reporteId,
      cambio: "estado",
    });
  });

  it("un reporte que ya esta en el estado pedido no se toca ni deja movimiento", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardado("EN_ATENCION"));

    await expect(
      reportes.mover(tx, {
        reporteId,
        estadoNuevo: "EN_ATENCION",
        contexto,
      }),
    ).resolves.toBe("SIN_CAMBIOS");

    expect(repositorio.aplicarTransicion).not.toHaveBeenCalled();
    expect(movimientos.agregar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
    expect(publicarMock).not.toHaveBeenCalled();
  });

  it.each(["RESUELTO", "RECHAZADO"] as const)(
    "un reporte %s no se reabre: la operacion informa que esta cerrado",
    async (estado) => {
      repositorio.buscarPorId.mockResolvedValue(guardado(estado));

      await expect(
        reportes.mover(tx, {
          reporteId,
          estadoNuevo: "EN_ATENCION",
          contexto,
        }),
      ).resolves.toBe("CERRADO");

      expect(repositorio.aplicarTransicion).not.toHaveBeenCalled();
      expect(movimientos.agregar).not.toHaveBeenCalled();
    },
  );

  it("cierra un reporte en atencion como RESUELTO, con su movimiento", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardado("EN_ATENCION"));

    await expect(
      reportes.mover(tx, { reporteId, estadoNuevo: "RESUELTO", contexto }),
    ).resolves.toBe("MOVIDO");

    expect(repositorio.aplicarTransicion).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        estadoAnterior: "EN_ATENCION",
        estadoNuevo: "RESUELTO",
      }),
    );
    expect(movimientos.agregar).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        estadoAnterior: "EN_ATENCION",
        estadoNuevo: "RESUELTO",
      }),
    );
  });

  it("un reporte invisible para el tenant informa que no existe", async () => {
    repositorio.buscarPorId.mockResolvedValue(null);

    await expect(
      reportes.mover(tx, {
        reporteId,
        estadoNuevo: "EN_ATENCION",
        contexto,
      }),
    ).resolves.toBe("AUSENTE");
  });

  it("una transicion que otra transaccion gano antes es un no encontrado", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardado("RECIBIDO"));
    repositorio.aplicarTransicion.mockResolvedValue(false);

    await expect(
      reportes.mover(tx, {
        reporteId,
        estadoNuevo: "EN_ATENCION",
        contexto,
      }),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    expect(movimientos.agregar).not.toHaveBeenCalled();
  });
});
