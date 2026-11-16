import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoEncontradoError } from "@/shared/lib/errores";
import { comoIntervencionId } from "../domain";
import type {
  IntervencionGuardada,
  RepositorioDeIntervenciones,
} from "./puertos";
import type { ReportesParaObra } from "./puertosDeReportes";

/**
 * S3 de `intervenciones-trazabilidad`: una intervencion ligada a un reporte lo
 * cierra como `RESUELTO` al finalizar, y cancelarla lo deja como esta. El
 * archivo base cubre las transiciones y sus rechazos.
 */
const tx = {};
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));
vi.mock("@/shared/notificaciones/notificar", () => ({
  publicarActualizacion: vi.fn(),
}));

const { crearCambiarEstadoDeIntervencion } = await import(
  "./cambiarEstadoDeIntervencion"
);

const reporteId = "55555555-5555-4555-8555-555555555555";
const intervencionId = "33333333-3333-4333-8333-333333333333";

const contexto = (): ContextoActual => ({
  ayuntamientoId:
    "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
});

const guardada = (
  estado: IntervencionGuardada["estado"],
  ligado: string | null,
) =>
  ({
    id: comoIntervencionId(intervencionId),
    estado,
    reporteId: ligado,
  }) as IntervencionGuardada;

const repositorio: Pick<
  RepositorioDeIntervenciones,
  "buscarPorId" | "aplicarTransicion"
> = {
  buscarPorId: vi.fn(),
  aplicarTransicion: vi.fn().mockResolvedValue(true),
};
const reportes: ReportesParaObra = { de: vi.fn(), mover: vi.fn() };

const cambiar = () =>
  crearCambiarEstadoDeIntervencion({ repositorio, reportes });

beforeEach(() => {
  vi.clearAllMocks();
  withTenantMock.mockImplementation(
    (_id: unknown, trabajo: (actualTx: unknown) => unknown) => trabajo(tx),
  );
  vi.mocked(repositorio.aplicarTransicion).mockResolvedValue(true);
  vi.mocked(reportes.mover).mockResolvedValue("MOVIDO");
});

describe("cierre del reporte ligado a la obra", () => {
  it("finalizar la obra cierra su reporte como resuelto, en la misma transaccion", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      guardada("EN_EJECUCION", reporteId),
    );

    await cambiar()(
      { id: intervencionId, estadoNuevo: "FINALIZADA" },
      contexto(),
    );

    expect(reportes.mover).toHaveBeenCalledWith(tx, {
      reporteId,
      estadoNuevo: "RESUELTO",
      contexto: contexto(),
    });
    expect(vi.mocked(reportes.mover).mock.calls[0]?.[0]).toBe(tx);
  });

  it.each(["CANCELADA", "EN_EJECUCION"] as const)(
    "pasar a %s deja el reporte ligado como esta",
    async (estadoNuevo) => {
      vi.mocked(repositorio.buscarPorId).mockResolvedValue(
        guardada("PLANIFICADA", reporteId),
      );

      await cambiar()({ id: intervencionId, estadoNuevo }, contexto());

      expect(reportes.mover).not.toHaveBeenCalled();
    },
  );

  it("finalizar una obra sin reporte no toca ningun reporte", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      guardada("EN_EJECUCION", null),
    );

    await cambiar()(
      { id: intervencionId, estadoNuevo: "FINALIZADA" },
      contexto(),
    );

    expect(reportes.mover).not.toHaveBeenCalled();
  });

  it("un reporte que desaparecio al finalizar revierte la transicion", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      guardada("EN_EJECUCION", reporteId),
    );
    vi.mocked(reportes.mover).mockResolvedValue("AUSENTE");

    await expect(
      cambiar()({ id: intervencionId, estadoNuevo: "FINALIZADA" }, contexto()),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});
