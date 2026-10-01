import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoReporteId } from "../domain";
import type { ReporteGuardado, RepositorioDeReportes } from "./puertos";

/**
 * El operador indica el original de un duplicado por su folio impreso, no
 * por su id: `cambiarEstadoDeReporte` lo resuelve dentro de la transaccion
 * y guarda el id que devuelve el repositorio.
 */
const withTenantMock = vi.hoisted(() => vi.fn());
const tx = { execute: vi.fn() };

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: vi.fn() }));

const { crearCambiarEstadoDeReporte } = await import(
  "./cambiarEstadoDeReporte"
);

const reporteId = comoReporteId("11111111-1111-4111-8111-111111111111");
const originalId = comoReporteId("22222222-2222-4222-8222-222222222222");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const reporte = {
  id: reporteId,
  estado: "RECIBIDO",
  motivoDeRechazo: null,
  duplicadoDeReporteId: null,
} as ReporteGuardado;

describe("cambiarEstadoDeReporte, duplicado por folio", () => {
  const repositorio: Pick<
    RepositorioDeReportes,
    "buscarPorId" | "candidatoAOriginalPorFolio" | "aplicarTransicion"
  > = {
    buscarPorId: vi.fn().mockResolvedValue(reporte),
    candidatoAOriginalPorFolio: vi.fn().mockResolvedValue({
      id: originalId,
      duplicadoDeReporteId: null,
    }),
    aplicarTransicion: vi.fn().mockResolvedValue(true),
  };
  const movimientos = { agregar: vi.fn(), historialDe: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo(tx),
    );
  });

  it("busca el original por el folio tecleado y guarda su id, no el folio", async () => {
    const cambiarEstado = crearCambiarEstadoDeReporte({
      repositorio,
      movimientos,
    });

    await cambiarEstado(
      {
        id: reporteId,
        estadoNuevo: "RECHAZADO",
        motivoDeRechazo: "DUPLICADO",
        folioDelOriginal: "REP-2026-000002",
      },
      contexto,
    );

    expect(repositorio.candidatoAOriginalPorFolio).toHaveBeenCalledWith(
      tx,
      "REP-2026-000002",
    );
    expect(repositorio.aplicarTransicion).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ duplicadoDeReporteId: originalId }),
    );
  });
});
