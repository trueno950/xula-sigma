import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * T1 · un reporte terminal (`RESUELTO`, `RECHAZADO`) no tiene transiciones
 * validas, pero la pagina envolvia a `AccionesDeReporte` -que devuelve
 * `null` cuando no hay destinos- en una tarjeta "Transiciones" vacia.
 *
 * El test mira la pagina y no el componente: la tarjeta es de la pagina, y
 * la decision de no montarla cuando el estado es terminal es justo lo que
 * se corrige. El componente se deja real (no se mockea el sujeto).
 */
const contextoActualMock = vi.hoisted(() => vi.fn());
const reportePorIdMock = vi.hoisted(() => vi.fn());
const historialDeReporteMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/reportes/ui/actions/cambiarEstadoAction", () => ({
  cambiarEstadoAction: "estado-action",
}));
vi.mock("@/modules/reportes/ui/actions/asignarAreaAction", () => ({
  asignarAreaAction: "area-action",
}));
vi.mock("@/modules/reportes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/reportes")>()),
  reportePorId: reportePorIdMock,
  historialDeReporte: historialDeReporteMock,
}));

const { default: PaginaDeDetalleDeReporte } = await import("./page");

const ID = "11111111-1111-4111-8111-111111111111";

type Estado = "RECIBIDO" | "EN_ATENCION" | "RESUELTO" | "RECHAZADO";

const reporte = (estado: Estado) => ({
  id: ID,
  folio: "REP-2026-000123",
  tipo: "BACHE",
  estado,
  areaResponsable: null,
  lugarId: "lugar-1",
  calleId: null,
  referencia: null,
  descripcion: "Bache en la calle 20",
  personaId: null,
  motivoDeRechazo: null,
  duplicadoDeReporteId: null,
  registradoPorUsuarioId: "u1",
  registradoEn: new Date("2026-01-01T18:00:00Z"),
  actualizadoEn: new Date("2026-01-01T18:00:00Z"),
});

const html = async () =>
  renderToStaticMarkup(
    await PaginaDeDetalleDeReporte({
      params: Promise.resolve({ id: ID }),
      searchParams: Promise.resolve({}),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    origen: "web",
  });
  historialDeReporteMock.mockResolvedValue([]);
});

describe("detalle de un reporte con transiciones", () => {
  it("un reporte recibido conserva la tarjeta y sus acciones", async () => {
    reportePorIdMock.mockResolvedValue(reporte("RECIBIDO"));

    const pagina = await html();

    expect(pagina).toContain("Transiciones");
    expect(pagina).toContain("Marcar en atención");
    expect(pagina).toContain("Marcar resuelto");
    expect(pagina).toContain("Asignar área");
  });
});

describe("detalle de un reporte en estado terminal", () => {
  it("un reporte resuelto no deja una tarjeta de transiciones vacia", async () => {
    reportePorIdMock.mockResolvedValue(reporte("RESUELTO"));

    const pagina = await html();

    expect(pagina).not.toContain("Transiciones");
    expect(pagina).toContain("REP-2026-000123");
    expect(pagina).toContain("Historial");
  });

  it("un reporte rechazado tampoco deja la tarjeta", async () => {
    reportePorIdMock.mockResolvedValue(reporte("RECHAZADO"));

    expect(await html()).not.toContain("Transiciones");
  });
});

describe("detalle de un reporte sin permiso de administrar", () => {
  it("un rol sin permiso no ve acciones ni tarjeta y si el aviso", async () => {
    contextoActualMock.mockResolvedValue({
      ayuntamientoId: "motul",
      usuario: { id: "u2", rol: "OPERADOR" },
      origen: "web",
    });
    reportePorIdMock.mockResolvedValue(reporte("RECIBIDO"));

    const pagina = await html();

    expect(pagina).not.toContain("Transiciones");
    expect(pagina).not.toContain("Asignar área");
    expect(pagina).toContain("Su rol no permite cambiar el estado");
  });
});
