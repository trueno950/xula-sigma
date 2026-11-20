import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S16 (P1) de `intervenciones-ux` en el detalle del reporte: al volver de
 * programar obra, la pantalla confirma con un aviso y un enlace «Ver la obra»,
 * y el enlace solo se pinta para una obra que el servidor leyó bajo RLS para
 * ese reporte. Va en su archivo y no en `page.test.tsx` porque ese ya roza el
 * límite de 200 líneas que verifica `pnpm reglas`.
 *
 * El test mira la página y no los componentes: la composición -qué panel se
 * monta, qué se lee del servidor antes de pintar- es de la página, y las
 * Server Actions se mockean porque el sujeto es el marcado.
 */
const contextoActualMock = vi.hoisted(() => vi.fn());
const detalleDeReporteMock = vi.hoisted(() => vi.fn());
const historialDeReporteMock = vi.hoisted(() => vi.fn());
const leerUmbralDeAtrasoMock = vi.hoisted(() => vi.fn());
const obrasDeReporteMock = vi.hoisted(() => vi.fn());

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
  ProgramarObra: ({ obras }: { obras?: readonly unknown[] }) => (
    <div data-obras={obras?.length ?? 0}>formulario de programar obra</div>
  ),
  obrasDeReporte: obrasDeReporteMock,
}));

const { default: PaginaDeDetalleDeReporte } = await import("./page");

const ID = "11111111-1111-4111-8111-111111111111";
const OBRA = "33333333-3333-4333-8333-333333333333";
const OTRA_OBRA = "44444444-4444-4444-8444-444444444444";

const obraDe = (id: string) => ({
  id,
  tipo: "BACHE",
  estado: "PLANIFICADA",
  fechaDeOcurrencia: "2026-11-20",
});

const reporte = {
  id: ID,
  folio: "REP-2026-000123",
  tipo: "BACHE",
  estado: "EN_ATENCION",
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
};

const html = async (parametros: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await PaginaDeDetalleDeReporte({
      params: Promise.resolve({ id: ID }),
      searchParams: Promise.resolve(parametros),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    origen: "web",
  });
  detalleDeReporteMock.mockResolvedValue(reporte);
  historialDeReporteMock.mockResolvedValue([]);
  leerUmbralDeAtrasoMock.mockResolvedValue(7);
  obrasDeReporteMock.mockResolvedValue([]);
});

describe("la confirmacion de S16 en el detalle del reporte", () => {
  it("con ?obra= de una obra del reporte avisa y enlaza", async () => {
    obrasDeReporteMock.mockResolvedValue([obraDe(OBRA)]);

    const pagina = await html({ obra: OBRA });

    expect(obrasDeReporteMock).toHaveBeenCalledWith(
      ID,
      expect.objectContaining({ ayuntamientoId: "motul" }),
    );
    expect(pagina).toContain("La obra quedó programada.");
    expect(pagina).toContain(`href="/intervenciones/${OBRA}"`);
    expect(pagina).toContain("Ver la obra");
  });

  it("con ?obra= de una obra ajena no confirma nada", async () => {
    obrasDeReporteMock.mockResolvedValue([obraDe(OBRA)]);

    const pagina = await html({ obra: OTRA_OBRA });

    expect(pagina).not.toContain("La obra quedó programada.");
    expect(pagina).not.toContain("Ver la obra");
  });

  it("con ?obra= que no es uuid no confirma nada", async () => {
    obrasDeReporteMock.mockResolvedValue([obraDe(OBRA)]);

    const pagina = await html({ obra: "no-es-un-uuid" });

    expect(pagina).not.toContain("La obra quedó programada.");
    expect(pagina).not.toContain("Ver la obra");
  });

  it("sin ?obra= no hay aviso de exito", async () => {
    obrasDeReporteMock.mockResolvedValue([obraDe(OBRA)]);

    expect(await html()).not.toContain("La obra quedó programada.");
  });

  it("las obras del reporte llegan al formulario para mostrarlas", async () => {
    obrasDeReporteMock.mockResolvedValue([obraDe(OBRA), obraDe(OTRA_OBRA)]);

    expect(await html()).toContain('data-obras="2"');
  });
});
