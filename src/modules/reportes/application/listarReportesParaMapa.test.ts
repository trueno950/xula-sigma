import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoReporteId } from "../domain";
import type {
  LectorDeReportesDeMapa,
  ReporteParaMapa,
} from "./puertosDeLecturaDeReportes";

const withTenantMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearListarReportesParaMapa } = await import(
  "./listarReportesParaMapa"
);

const contextoCon = (
  rol: ContextoActual["usuario"]["rol"],
): ContextoActual => ({
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const reporteSinCalle: ReporteParaMapa = {
  id: comoReporteId("11111111-1111-4111-8111-111111111111"),
  folio: "REP-2026-000001",
  tipo: "BACHE",
  estado: "RECIBIDO",
  areaResponsable: null,
  calleId: null,
  lugarId: "22222222-2222-4222-8222-222222222222",
};

const reporteConCalle: ReporteParaMapa = {
  ...reporteSinCalle,
  id: comoReporteId("33333333-3333-4333-8333-333333333333"),
  folio: "REP-2026-000002",
  calleId: "44444444-4444-4444-8444-444444444444",
};

describe("listarReportesParaMapa", () => {
  const lector: LectorDeReportesDeMapa = { listarParaMapa: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    vi.mocked(lector.listarParaMapa).mockResolvedValue([
      reporteSinCalle,
      reporteConCalle,
    ]);
  });

  it("conserva la fila con calleId nulo: el mapa la declara cobertura faltante", async () => {
    const filas = await crearListarReportesParaMapa(lector)(
      contextoCon("CONSULTA"),
    );

    const sinCalle = filas.find((fila) => fila.folio === reporteSinCalle.folio);

    expect(sinCalle).toEqual(reporteSinCalle);
    expect(sinCalle?.calleId).toBeNull();
  });

  it("fija el tenant desde el contexto del servidor, no de la entrada", async () => {
    await crearListarReportesParaMapa(lector)(contextoCon("OPERADOR"));

    expect(withTenantMock).toHaveBeenCalledWith("motul", expect.any(Function));
    expect(lector.listarParaMapa).toHaveBeenCalledWith({});
  });

  it("no exige guarda administrativa: un CONSULTA lee el mapa", async () => {
    await expect(
      crearListarReportesParaMapa(lector)(contextoCon("CONSULTA")),
    ).resolves.toHaveLength(2);
  });

  it("cada fila trae exactamente los siete campos contratados", async () => {
    const filas = await crearListarReportesParaMapa(lector)(
      contextoCon("CONSULTA"),
    );

    expect(Object.keys(filas[0] ?? {}).sort()).toEqual([
      "areaResponsable",
      "calleId",
      "estado",
      "folio",
      "id",
      "lugarId",
      "tipo",
    ]);
  });
});

/**
 * Assertion de tipo, no de runtime: `vitest` no evalua `@ts-expect-error`,
 * asi que esto se prueba solo si `tsc --noEmit` corre. `ReporteParaMapa` no
 * tiene `descripcion` ni `referencia` -siguen protegidas en el detalle del
 * reporte-: si alguien las agrega al contrato, el chequeo de propiedades
 * excedentes sobre este literal deja de fallar y "Unused
 * '@ts-expect-error' directive" rompe `tsc --noEmit`.
 */
const _conDescripcion: ReporteParaMapa = {
  id: comoReporteId("55555555-5555-4555-8555-555555555555"),
  folio: "REP-2026-000003",
  tipo: "BACHE",
  estado: "RECIBIDO",
  areaResponsable: null,
  calleId: null,
  lugarId: "22222222-2222-4222-8222-222222222222",
  // @ts-expect-error descripcion no existe en ReporteParaMapa
  descripcion: "no debe salir por la lectura del mapa",
};
void _conDescripcion;
