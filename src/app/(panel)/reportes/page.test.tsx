import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La composición de la bandeja (S1-S6 de `reportes-ux`): la página resuelve
 * el estado de la URL, pide los conteos con el filtro de estado quitado y
 * arma la cabecera con sus dos permisos. Los casos de uso se mockean porque
 * el sujeto es lo que la pantalla decide, no lo que Postgres cuenta.
 */
const contextoActualMock = vi.hoisted(() => vi.fn());
const leerUmbralDeAtrasoMock = vi.hoisted(() => vi.fn());
const leerLaBandejaMock = vi.hoisted(() => vi.fn());
const cargarFiltrosDeTerritorioMock = vi.hoisted(() => vi.fn());
const filtrosDeLaConsultaMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/shared/lib/fecha", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/fecha")>()),
  hoyEnMerida: () => "2026-11-20",
}));
vi.mock("@/modules/reportes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/reportes")>()),
  leerUmbralDeAtraso: leerUmbralDeAtrasoMock,
}));
vi.mock("./cargaDeLaBandeja", () => ({
  cargarFiltrosDeTerritorio: cargarFiltrosDeTerritorioMock,
  filtrosDeLaConsulta: filtrosDeLaConsultaMock,
  leerLaBandeja: leerLaBandejaMock,
}));

const { default: PaginaDeReportes } = await import("./page");

const ID = "11111111-1111-4111-8111-111111111111";

const textoPlano = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

const conteos = (porEstado: Record<string, number>, total: number) => ({
  porEstado: {
    RECIBIDO: 0,
    EN_ATENCION: 0,
    RESUELTO: 0,
    RECHAZADO: 0,
    ...porEstado,
  },
  porArea: [],
  total,
});

const reporteAtrasado = {
  id: ID,
  folio: "REP-2026-000001",
  tipo: "BACHE",
  estado: "RECIBIDO",
  areaResponsable: null,
  lugarId: "lugar-1",
  calleId: null,
  referencia: null,
  descripcion: "Bache en la calle 20",
  personaId: null,
  motivoDeRechazo: null,
  duplicadoDeReporteId: null,
  registradoPorUsuarioId: "u1",
  registradoEn: new Date("2026-11-05T18:00:00Z"),
  actualizadoEn: new Date("2026-11-05T18:00:00Z"),
  ubicacion: {
    modo: "CALLE",
    lugar: "Motul",
    calleId: null,
    calle: "Calle 20",
    domicilio: null,
    raizId: null,
  },
};

const html = async (rol: string, consulta = ""): Promise<string> => {
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "e2e00000-0000-4000-8000-000000000001",
    usuario: { id: "u1", rol },
    origen: "prueba",
  });

  return renderToStaticMarkup(
    await PaginaDeReportes({
      searchParams: Promise.resolve(
        Object.fromEntries(new URLSearchParams(consulta)),
      ),
    }),
  );
};

beforeEach(() => {
  leerUmbralDeAtrasoMock.mockResolvedValue(7);
  cargarFiltrosDeTerritorioMock.mockResolvedValue({
    opciones: [],
    lugares: [],
  });
  filtrosDeLaConsultaMock.mockImplementation(
    (datos: { filtros: unknown }) => datos.filtros,
  );
  leerLaBandejaMock.mockResolvedValue({
    reportes: [reporteAtrasado],
    hayMas: false,
    conteosPorEstado: conteos({ RECIBIDO: 2, EN_ATENCION: 1 }, 3),
    conteosPorArea: conteos({ RECIBIDO: 2, EN_ATENCION: 1 }, 3),
    totalDeAtrasados: 2,
  });
});

describe("PaginaDeReportes, estado en la URL", () => {
  it("la pestaña del estado pedido queda activa y las cuentas vienen del servidor", async () => {
    const pagina = await html("ADMIN_MUNICIPAL", "estado=RECIBIDO");

    expect(pagina).toMatch(
      /<a(?=[^>]*href="\/reportes\?estado=RECIBIDO")(?=[^>]*aria-current="page")[^>]*>/,
    );
    expect(textoPlano(pagina)).toContain("Recibidos 2");
    expect(textoPlano(pagina)).toContain("Solo atrasados 2");
  });

  it("el corte de atrasados se calcula con el umbral del municipio y el día de hoy", async () => {
    const pagina = await html("ADMIN_MUNICIPAL", "atrasados=1");

    expect(pagina).toContain("Atrasado · 15 días");
    expect(pagina).toContain('aria-pressed="true"');
  });
});

describe("PaginaDeReportes, la cabecera de S5", () => {
  it("dice para qué sirve la pantalla en un renglón", async () => {
    const pagina = await html("ADMIN_MUNICIPAL");

    expect(pagina).toContain("Reportes ciudadanos");
    expect(pagina).toContain(
      "Lo que reportan los vecinos y en qué orden conviene atenderlo.",
    );
  });

  it("el administrador ve «Registrar reporte» y «Configurar atraso»", async () => {
    const pagina = await html("ADMIN_MUNICIPAL");

    expect(pagina).toContain("Registrar reporte");
    expect(pagina).toContain("Configurar atraso");
  });

  it("quien opera registra pero no configura el atraso", async () => {
    const pagina = await html("OPERADOR");

    expect(pagina).toContain("Registrar reporte");
    expect(pagina).not.toContain("Configurar atraso");
  });

  it("el rol de solo lectura no ve ninguna de las dos acciones", async () => {
    const pagina = await html("CONSULTA");

    expect(pagina).not.toContain("Registrar reporte");
    expect(pagina).not.toContain("Configurar atraso");
  });
});
