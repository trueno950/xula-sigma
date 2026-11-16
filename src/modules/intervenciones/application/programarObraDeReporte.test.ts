import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  NoAutorizadoError,
  NoEncontradoError,
  ValidacionError,
} from "@/shared/lib/errores";
import { ReporteNoProgramableError } from "../domain";
import type { RepositorioDeIntervenciones } from "./puertos";
import type { ReportesParaObra } from "./puertosDeReportes";

const tx = { marca: "tx-de-programar-obra" };
const withTenantMock = vi.hoisted(() => vi.fn());
const registrarMock = vi.hoisted(() => vi.fn());
const publicarMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({ withTenant: withTenantMock }));
vi.mock("@/shared/tenancy/bitacora", () => ({ registrar: registrarMock }));
vi.mock("@/shared/notificaciones/notificar", () => ({
  publicarActualizacion: publicarMock,
}));

const { crearProgramarObraDeReporte } = await import(
  "./programarObraDeReporte"
);

const ayuntamientoId =
  "11111111-1111-4111-8111-111111111111" as ContextoActual["ayuntamientoId"];
const reporteId = "55555555-5555-4555-8555-555555555555";
const lugarId = "22222222-2222-4222-8222-222222222222";
const calleId = "44444444-4444-4444-8444-444444444444";

const contexto = (
  rol: ContextoActual["usuario"]["rol"] = "ADMIN_MUNICIPAL",
): ContextoActual => ({
  ayuntamientoId,
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const entrada = {
  reporteId,
  tipo: "BACHE" as const,
  descripcion: "Bacheo de la calle frente al parque",
};

const repositorio: Pick<RepositorioDeIntervenciones, "guardar"> = {
  guardar: vi.fn(),
};
const reportes: ReportesParaObra = {
  de: vi.fn(),
  mover: vi.fn(),
};
const programar = crearProgramarObraDeReporte({
  repositorio,
  reportes,
  hoy: () => "2026-11-16",
});

beforeEach(() => {
  vi.clearAllMocks();
  withTenantMock.mockImplementation(
    (_id: unknown, trabajo: (actual: unknown) => unknown) => trabajo(tx),
  );
  vi.mocked(reportes.de).mockResolvedValue({
    id: reporteId,
    estado: "RECIBIDO",
    lugarId,
    calleId,
  });
  vi.mocked(reportes.mover).mockResolvedValue("MOVIDO");
});

describe("programarObraDeReporte", () => {
  it("crea la intervencion planificada con el lugar y la calle del reporte", async () => {
    const id = await programar(entrada, contexto());

    expect(repositorio.guardar).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        id,
        ayuntamientoId,
        tipo: "BACHE",
        estado: "PLANIFICADA",
        fechaDeOcurrencia: "2026-11-16",
        lugarId,
        calleId,
        reporteId,
        descripcion: entrada.descripcion,
        registradoPorUsuarioId: "usuario-1",
      }),
    );
  });

  it("mueve el reporte y crea la intervencion en la misma transaccion", async () => {
    await programar(entrada, contexto());

    expect(reportes.de).toHaveBeenCalledWith(tx, reporteId);
    expect(reportes.mover).toHaveBeenCalledWith(tx, {
      reporteId,
      estadoNuevo: "EN_ATENCION",
      contexto: contexto(),
    });
    expect(vi.mocked(reportes.mover).mock.calls[0]?.[0]).toBe(tx);
    expect(vi.mocked(repositorio.guardar).mock.calls[0]?.[0]).toBe(tx);
  });

  it("audita y publica el alta de la intervencion", async () => {
    const id = await programar(entrada, contexto());

    expect(registrarMock).toHaveBeenCalledWith(tx, {
      ayuntamientoId,
      actor: "usuario-1",
      origen: "web",
      accion: "PROGRAMAR_OBRA",
      entidad: "intervenciones",
      entidadId: id,
    });
    expect(publicarMock).toHaveBeenCalledWith(tx, ayuntamientoId, {
      tipo: "intervencion",
      id,
      cambio: "alta",
    });
  });

  it("acepta un reporte que ya estaba en atencion sin moverlo otra vez", async () => {
    vi.mocked(reportes.mover).mockResolvedValue("SIN_CAMBIOS");

    await expect(programar(entrada, contexto())).resolves.toEqual(
      expect.any(String),
    );
    expect(repositorio.guardar).toHaveBeenCalledTimes(1);
  });

  it("rechaza un reporte cerrado sin escribir la intervencion", async () => {
    vi.mocked(reportes.mover).mockResolvedValue("CERRADO");

    await expect(programar(entrada, contexto())).rejects.toBeInstanceOf(
      ReporteNoProgramableError,
    );
    expect(repositorio.guardar).not.toHaveBeenCalled();
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("trata un reporte de otro municipio como inexistente, sin escribir", async () => {
    vi.mocked(reportes.de).mockResolvedValue(null);

    await expect(programar(entrada, contexto())).rejects.toBeInstanceOf(
      NoEncontradoError,
    );
    expect(reportes.mover).not.toHaveBeenCalled();
    expect(repositorio.guardar).not.toHaveBeenCalled();
  });

  it("informa no encontrado si el reporte desaparecio al moverlo", async () => {
    vi.mocked(reportes.mover).mockResolvedValue("AUSENTE");

    await expect(programar(entrada, contexto())).rejects.toBeInstanceOf(
      NoEncontradoError,
    );
    expect(repositorio.guardar).not.toHaveBeenCalled();
  });

  it("niega roles que no administran intervenciones, antes de abrir transaccion", async () => {
    for (const rol of ["OPERADOR", "CONSULTA", "SUPER_ADMIN"] as const) {
      await expect(programar(entrada, contexto(rol))).rejects.toBeInstanceOf(
        NoAutorizadoError,
      );
    }
    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("valida el borde estricto antes de tocar la base", async () => {
    await expect(
      programar({ ...entrada, reporteId: "no-es-uuid" }, contexto()),
    ).rejects.toBeInstanceOf(ValidacionError);
    await expect(
      programar({ ...entrada, tipo: "PAVIMENTO" }, contexto()),
    ).rejects.toBeInstanceOf(ValidacionError);
    await expect(
      programar({ ...entrada, descripcion: "corta" }, contexto()),
    ).rejects.toBeInstanceOf(ValidacionError);
    await expect(
      programar({ ...entrada, ayuntamientoId }, contexto()),
    ).rejects.toBeInstanceOf(ValidacionError);
    expect(withTenantMock).not.toHaveBeenCalled();
  });
});
