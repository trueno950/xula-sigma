import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S11-S15 de `reportes-ux`: el detalle en dos columnas, con la ficha a la
 * izquierda y el panel de acciones a la derecha. El test mira la pagina y no
 * los componentes: la composicion -que panel se monta y cual no- es de la
 * pagina, y las Server Actions se mockean porque el sujeto es el marcado.
 */
const contextoActualMock = vi.hoisted(() => vi.fn());
const detalleDeReporteMock = vi.hoisted(() => vi.fn());
const historialDeReporteMock = vi.hoisted(() => vi.fn());
const leerUmbralDeAtrasoMock = vi.hoisted(() => vi.fn());
const obrasDeReporteMock = vi.hoisted(() => vi.fn(async () => []));

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/shared/lib/fecha", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/fecha")>()),
  hoyEnMerida: () => "2026-11-20",
}));
vi.mock("@/modules/reportes/ui/actions/cambiarEstadoAction", () => ({
  cambiarEstadoAction: "estado-action",
}));
vi.mock("@/modules/reportes/ui/actions/asignarAreaAction", () => ({
  asignarAreaAction: "area-action",
}));
vi.mock("@/modules/reportes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/reportes")>()),
  detalleDeReporte: detalleDeReporteMock,
  historialDeReporte: historialDeReporteMock,
  leerUmbralDeAtraso: leerUmbralDeAtrasoMock,
}));
vi.mock("@/modules/intervenciones", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/intervenciones")>()),
  ProgramarObra: () => <div>formulario de programar obra</div>,
  obrasDeReporte: obrasDeReporteMock,
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
  calleId: "calle-1",
  referencia: null,
  descripcion: "Bache en la calle 20",
  personaId: null,
  motivoDeRechazo: null,
  duplicadoDeReporteId: null,
  registradoPorUsuarioId: "u1",
  registradoEn: new Date("2026-11-16T17:15:00Z"),
  actualizadoEn: new Date("2026-11-16T17:15:00Z"),
  fechaDeRegistro: "2026-11-16",
  ubicacion: {
    modo: "CALLE" as const,
    lugar: "Colonia Centro",
    calleId: "calle-1",
    calle: "Calle 26",
    domicilio: null,
    raizId: "raiz-1",
  },
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
  leerUmbralDeAtrasoMock.mockResolvedValue(7);
});

describe("detalle de un reporte con transiciones", () => {
  it("el panel de acciones lleva el paso siguiente y lo demas plegado", async () => {
    detalleDeReporteMock.mockResolvedValue(reporte("RECIBIDO"));

    const pagina = await html();

    expect(pagina).toContain(">Acciones<");
    expect(pagina).toContain("Siguiente paso");
    expect(pagina).toContain("Marcar en atención");
    expect(pagina).toContain("Asignar área…");
    expect(pagina).not.toContain("Transiciones");
    expect(pagina.indexOf("Rechazar reporte…")).toBeGreaterThan(
      pagina.indexOf("Asignar área…"),
    );
  });
});

describe("detalle de un reporte, donde ocurrio y cuando se registro", () => {
  it("la linea bajo el folio y la ficha nombran la ubicacion y la fecha", async () => {
    detalleDeReporteMock.mockResolvedValue(reporte("RECIBIDO"));

    const pagina = await html();

    expect(pagina).toContain("Bache en Calle 26, Colonia Centro");
    expect(pagina).toContain(">Fecha de registro<");
    expect(pagina).toContain("16 nov 2026");
    expect(pagina).toContain('href="/calles/calle-1/historial"');
    expect(pagina).toContain('href="/mapa-operativo?lugar=raiz-1"');
  });

  it("el atraso se marca con la misma insignia que la bandeja", async () => {
    detalleDeReporteMock.mockResolvedValue(reporte("RECIBIDO"));
    leerUmbralDeAtrasoMock.mockResolvedValue(3);

    expect(await html()).toContain("Atrasado · 4 días");
  });
});

describe("detalle de un reporte en estado terminal", () => {
  it.each(["RESUELTO", "RECHAZADO"] as const)(
    "un reporte %s no monta el panel y lo dice en la ficha",
    async (estado) => {
      detalleDeReporteMock.mockResolvedValue(reporte(estado));

      const pagina = await html();

      expect(pagina).not.toContain(">Acciones<");
      expect(pagina).toContain("Sin acciones: el reporte está cerrado.");
      expect(pagina).toContain("REP-2026-000123");
      expect(pagina).toContain("Historial");
    },
  );
});

describe("detalle de un reporte sin permiso de administrar", () => {
  it("un rol sin permiso ve el aviso de permiso en vez del panel", async () => {
    contextoActualMock.mockResolvedValue({
      ayuntamientoId: "motul",
      usuario: { id: "u2", rol: "OPERADOR" },
      origen: "web",
    });
    detalleDeReporteMock.mockResolvedValue(reporte("RECIBIDO"));

    const pagina = await html();

    expect(pagina).not.toContain(">Acciones<");
    expect(pagina).not.toContain("Asignar área");
    expect(pagina).toContain("Su rol no permite cambiar el estado");
  });
});

describe("programar obra desde el detalle del reporte", () => {
  it("un reporte recibido ofrece programar obra dentro del panel", async () => {
    detalleDeReporteMock.mockResolvedValue(reporte("RECIBIDO"));

    const pagina = await html();

    expect(pagina).toContain("Programar obra…");
    expect(pagina).toContain("formulario de programar obra");
  });

  it.each(["RESUELTO", "RECHAZADO"] as const)(
    "un reporte %s ya no admite obra",
    async (estado) => {
      detalleDeReporteMock.mockResolvedValue(reporte(estado));

      const pagina = await html();

      expect(pagina).not.toContain("Programar obra");
      expect(pagina).not.toContain("formulario de programar obra");
    },
  );

  it("un rol sin permiso de administrar reportes no ve el formulario", async () => {
    contextoActualMock.mockResolvedValue({
      ayuntamientoId: "motul",
      usuario: { id: "u2", rol: "OPERADOR" },
      origen: "web",
    });
    detalleDeReporteMock.mockResolvedValue(reporte("RECIBIDO"));

    expect(await html()).not.toContain("formulario de programar obra");
  });
});
