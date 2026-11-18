import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { comoReporteId } from "../domain";
import type { ReporteGuardado, RepositorioDeReportes } from "./puertos";
import type { CatalogoDeNombres } from "./puertosDeUbicacionesDeReporte";

const withTenantMock = vi.hoisted(() => vi.fn());
const leerNombresMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/tenancy/withTenant", () => ({
  withTenant: withTenantMock,
}));

const { crearDetalleDeReporte } = await import("./detalleDeReporte");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "CONSULTA" },
  origen: "web",
};

const reporteId = comoReporteId("11111111-1111-4111-8111-111111111111");

const catalogo: CatalogoDeNombres = {
  lugares: new Map([
    ["lugar-1", { nombre: "Colonia Centro", raizId: "raiz-1" }],
  ]),
  calles: new Map([["calle-1", "Calle 20"]]),
  domicilios: new Map(),
};

const guardado = (registradoEn: Date): ReporteGuardado =>
  ({
    id: reporteId,
    folio: "REP-2026-000001",
    tipo: "BACHE",
    estado: "RECIBIDO",
    areaResponsable: null,
    lugarId: "lugar-1",
    calleId: "calle-1",
    domicilioId: null,
    referencia: null,
    descripcion: "Bache grande",
    personaId: null,
    motivoDeRechazo: null,
    duplicadoDeReporteId: null,
    registradoPorUsuarioId: "usuario-1",
    registradoEn,
    actualizadoEn: registradoEn,
  }) as ReporteGuardado;

describe("detalleDeReporte", () => {
  const repositorio: Pick<RepositorioDeReportes, "buscarPorId"> = {
    buscarPorId: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    withTenantMock.mockImplementation(
      (_id: unknown, trabajo: (tx: unknown) => unknown) => trabajo({}),
    );
    leerNombresMock.mockResolvedValue(catalogo);
  });

  const crearLectura = () => ({ leer: leerNombresMock });

  it("un reporte de otro tenant o inexistente devuelve null sin leer territorio", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);
    const detalleDeReporte = crearDetalleDeReporte({
      repositorio,
      crearLecturaDeNombres: crearLectura,
    });

    await expect(detalleDeReporte(reporteId, contexto)).resolves.toBeNull();
    expect(leerNombresMock).not.toHaveBeenCalled();
  });

  it("devuelve el reporte con su ubicacion legible", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      guardado(new Date("2026-11-17T18:00:00Z")),
    );
    const detalleDeReporte = crearDetalleDeReporte({
      repositorio,
      crearLecturaDeNombres: crearLectura,
    });

    await expect(detalleDeReporte(reporteId, contexto)).resolves.toMatchObject({
      folio: "REP-2026-000001",
      ubicacion: {
        modo: "CALLE",
        lugar: "Colonia Centro",
        calle: "Calle 20",
        calleId: "calle-1",
        raizId: "raiz-1",
      },
    });
  });

  /**
   * S11 pide la fecha de registro; el modo de falla de leerla con
   * `getDate()` es que el servidor corre en UTC. Las 21:00 del 31 de
   * diciembre en Merida ya son el 1 de enero en el proceso.
   */
  it("la fecha de registro es la civil de Merida, no la del proceso", async () => {
    vi.mocked(repositorio.buscarPorId).mockResolvedValue(
      guardado(new Date("2026-01-01T03:00:00Z")),
    );
    const detalleDeReporte = crearDetalleDeReporte({
      repositorio,
      crearLecturaDeNombres: crearLectura,
    });

    const detalle = await detalleDeReporte(reporteId, contexto);

    expect(detalle?.fechaDeRegistro).toBe("2025-12-31");
  });
});
