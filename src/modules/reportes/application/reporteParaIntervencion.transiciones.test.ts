import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import {
  comoReporteId,
  type EstadoDeReporte,
  TransicionInvalidaError,
} from "../domain";
import type { ReporteGuardado } from "./puertos";
import type { EstadoDeReporteParaObra } from "./reporteParaIntervencion";

/**
 * Los rechazos de `reporteParaIntervencion.mover`, en su propio archivo por la
 * metrica de lineas (el camino feliz vive en `reporteParaIntervencion.test.ts`):
 * lo que ya estaba en el destino, lo que esta cerrado y lo que la tabla de
 * transiciones del dominio no admite.
 */
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
    calleId: null,
  }) as ReporteGuardado;

const repositorio = { buscarPorId: vi.fn(), aplicarTransicion: vi.fn() };
const movimientos = { agregar: vi.fn() };
const reportes = crearReporteParaIntervencion({ repositorio, movimientos });

beforeEach(() => {
  vi.clearAllMocks();
  repositorio.aplicarTransicion.mockResolvedValue(true);
});

describe("reporteParaIntervencion.mover: lo que no escribe", () => {
  it("un reporte que ya esta en el estado pedido no se toca ni deja movimiento", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardado("EN_ATENCION"));

    await expect(
      reportes.mover(tx, { reporteId, estadoNuevo: "EN_ATENCION", contexto }),
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
        reportes.mover(tx, { reporteId, estadoNuevo: "EN_ATENCION", contexto }),
      ).resolves.toBe("CERRADO");

      expect(repositorio.aplicarTransicion).not.toHaveBeenCalled();
      expect(movimientos.agregar).not.toHaveBeenCalled();
    },
  );

  it("una transicion fuera del cuadro del dominio no se escribe", async () => {
    repositorio.buscarPorId.mockResolvedValue(guardado("EN_ATENCION"));

    // `RECIBIDO` es un estado valido del reporte, pero volver a el no esta en
    // la tabla: el puerto tiene que rechazarlo como el camino manual, no
    // escribir un UPDATE que la base aceptaria.
    await expect(
      reportes.mover(tx, {
        reporteId,
        estadoNuevo: "RECIBIDO" as EstadoDeReporteParaObra,
        contexto,
      }),
    ).rejects.toBeInstanceOf(TransicionInvalidaError);

    expect(repositorio.aplicarTransicion).not.toHaveBeenCalled();
    expect(movimientos.agregar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });
});
