import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import { SIN_REGISTRO } from "../domain";
import type { FilaParaConsultaPublica, RepositorioDeReportes } from "./puertos";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearConsultarFolioDeReporte } = await import(
  "./consultarFolioDeReporte"
);

/**
 * `toBe`, no `toEqual`, para el negativo: identidad, no forma (design.md
 * seccion 14, mismo criterio que `domain/consulta.test.ts`).
 */

const MOTUL = "11111111-1111-1111-1111-111111111111" as AyuntamientoId;

const CONSULTADO: FilaParaConsultaPublica = {
  tipo: "FUGA",
  estado: "RECHAZADO",
  registradoEn: new Date("2026-08-28T10:00:00.000Z"),
  actualizadoEn: new Date("2026-08-28T11:00:00.000Z"),
  duplicadoDeReporteId: null,
};

const ORIGINAL: FilaParaConsultaPublica = {
  tipo: "FUGA",
  estado: "EN_ATENCION",
  registradoEn: new Date("2026-08-01T09:00:00.000Z"),
  actualizadoEn: new Date("2026-08-27T15:00:00.000Z"),
  duplicadoDeReporteId: null,
};

type RepositorioDeConsulta = Pick<
  RepositorioDeReportes,
  "paraConsultaPublica" | "paraConsultaPublicaPorId"
>;

const repositorioCon = (
  consultado: FilaParaConsultaPublica | null,
  original: FilaParaConsultaPublica | null = null,
): RepositorioDeConsulta => ({
  paraConsultaPublica: vi.fn().mockResolvedValue(consultado),
  paraConsultaPublicaPorId: vi.fn().mockResolvedValue(original),
});

beforeEach(() => {
  vi.clearAllMocks();
  withTenantMock.mockImplementation(
    (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
  );
});

describe("consultarFolioDeReporte", () => {
  it("folio inexistente: null del repositorio -> SIN_REGISTRO, la misma referencia", async () => {
    const repositorio = repositorioCon(null);
    const consultarFolioDeReporte = crearConsultarFolioDeReporte(repositorio);

    const resultado = await consultarFolioDeReporte({
      ayuntamientoId: MOTUL,
      folio: "REP-2026-000099",
    });

    expect(resultado).toBe(SIN_REGISTRO);
  });

  it("folio con formato invalido: SIN_REGISTRO sin tocar el repositorio", async () => {
    const repositorio = repositorioCon(CONSULTADO);
    const consultarFolioDeReporte = crearConsultarFolioDeReporte(repositorio);

    const resultado = await consultarFolioDeReporte({
      ayuntamientoId: MOTUL,
      folio: "'; DROP TABLE reportes; --",
    });

    expect(resultado).toBe(SIN_REGISTRO);
    expect(repositorio.paraConsultaPublica).not.toHaveBeenCalled();
    expect(withTenantMock).not.toHaveBeenCalled();
  });

  it("sin duplicadoDeReporteId: una sola llamada, paraConsultaPublicaPorId nunca invocado", async () => {
    const repositorio = repositorioCon(CONSULTADO);
    const consultarFolioDeReporte = crearConsultarFolioDeReporte(repositorio);

    await consultarFolioDeReporte({
      ayuntamientoId: MOTUL,
      folio: "REP-2026-000001",
    });

    expect(repositorio.paraConsultaPublica).toHaveBeenCalledTimes(1);
    expect(repositorio.paraConsultaPublicaPorId).not.toHaveBeenCalled();
  });

  it("con duplicadoDeReporteId: exactamente dos llamadas al repositorio", async () => {
    const repositorio = repositorioCon(
      { ...CONSULTADO, duplicadoDeReporteId: "original-1" },
      ORIGINAL,
    );
    const consultarFolioDeReporte = crearConsultarFolioDeReporte(repositorio);

    await consultarFolioDeReporte({
      ayuntamientoId: MOTUL,
      folio: "REP-2026-000002",
    });

    expect(repositorio.paraConsultaPublica).toHaveBeenCalledTimes(1);
    expect(repositorio.paraConsultaPublicaPorId).toHaveBeenCalledTimes(1);
  });

  it("camino feliz sin salto: tipo, estado y fechas del propio consultado", async () => {
    const repositorio = repositorioCon(CONSULTADO);
    const consultarFolioDeReporte = crearConsultarFolioDeReporte(repositorio);

    const resultado = await consultarFolioDeReporte({
      ayuntamientoId: MOTUL,
      folio: "REP-2026-000001",
    });

    expect(resultado).toEqual({
      resultado: "REGISTRADO",
      tipo: CONSULTADO.tipo,
      estado: CONSULTADO.estado,
      registradoEn: CONSULTADO.registradoEn.toISOString(),
      actualizadoEn: CONSULTADO.actualizadoEn.toISOString(),
    });
  });

  it("camino feliz con salto: tipo y registradoEn del consultado; estado y actualizadoEn del original", async () => {
    const consultadoDuplicado = {
      ...CONSULTADO,
      duplicadoDeReporteId: "original-1",
    };
    const repositorio = repositorioCon(consultadoDuplicado, ORIGINAL);
    const consultarFolioDeReporte = crearConsultarFolioDeReporte(repositorio);

    const resultado = await consultarFolioDeReporte({
      ayuntamientoId: MOTUL,
      folio: "REP-2026-000002",
    });

    expect(resultado).toEqual({
      resultado: "REGISTRADO",
      tipo: consultadoDuplicado.tipo,
      estado: ORIGINAL.estado,
      registradoEn: consultadoDuplicado.registradoEn.toISOString(),
      actualizadoEn: ORIGINAL.actualizadoEn.toISOString(),
    });
    // `registradoEn` es siempre el del consultado, nunca el del original.
    expect(resultado).not.toMatchObject({
      registradoEn: ORIGINAL.registradoEn.toISOString(),
    });
  });
});
