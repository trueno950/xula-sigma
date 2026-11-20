import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S11 y S15 de `intervenciones-ux` sobre la pagina real: el historial de
 * `revisiones_de_intervenciones` y las salidas del lugar y de la calle.
 *
 * Vive aparte de `page.test.tsx` por la metrica de 200 lineas de `AGENTS.md`,
 * y el corte cae por tema: alla la cabecera, la ficha y las acciones, aca el
 * historial y la ubicacion, con los mismos dobles de la pagina.
 */
const contextoActualMock = vi.hoisted(() => vi.fn());
const intervencionConReferenciasMock = vi.hoisted(() => vi.fn());
const historialDeIntervencionMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/intervenciones/ui/actions/cambiarEstadoAction", () => ({
  cambiarEstadoAction: "estado-action",
}));
vi.mock(
  "@/modules/intervenciones/ui/actions/corregirIntervencionAction",
  () => ({
    corregirIntervencionAction: "corregir-action",
  }),
);
vi.mock("@/modules/intervenciones", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/intervenciones")>()),
  intervencionConReferencias: intervencionConReferenciasMock,
  historialDeIntervencion: historialDeIntervencionMock,
}));

const { default: PaginaDeDetalleDeIntervencion } = await import("./page");

const ID = "33333333-3333-4333-8333-333333333333";
const LUGAR = "22222222-2222-4222-8222-222222222222";
const CALLE = "44444444-4444-4444-8444-444444444444";
const RAIZ = "55555555-5555-4555-8555-555555555555";

const contexto = (rol: "ADMIN_MUNICIPAL" | "OPERADOR") => ({
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const intervencion = (parcial: Partial<Record<string, unknown>> = {}) => ({
  id: ID,
  tipo: "PAVIMENTACION",
  estado: "EN_EJECUCION",
  fechaDeOcurrencia: "2026-11-12",
  lugarId: LUGAR,
  calleId: CALLE,
  reporteId: null,
  descripcion: "Pavimentación con concreto hidráulico de la calle de acceso.",
  registradoPorUsuarioId: "usuario-ana",
  capturadoEn: new Date("2026-11-12T15:20:00Z"),
  actualizadoEn: new Date("2026-11-15T15:40:00Z"),
  ...parcial,
});

const referencias = (parcial: Partial<Record<string, unknown>> = {}) => ({
  lugar: "Colonia Centro (colonia)",
  calle: "Calle 26",
  reporte: null,
  raizId: RAIZ,
  ...parcial,
});

const historial = () => ({
  revisiones: [
    {
      id: "revision-1",
      titulo: "Descripción corregida",
      cambios: ["Antes decía «Pavimentación de la calle de acceso.»."],
      ocurridoEn: new Date("2026-11-13T16:05:00Z"),
      autor: { nombre: "Ana Canché", rol: "ADMIN_MUNICIPAL" },
    },
  ],
  registradaPor: { nombre: "Ana Canché", rol: "ADMIN_MUNICIPAL" },
});

const html = async () =>
  renderToStaticMarkup(
    await PaginaDeDetalleDeIntervencion({
      params: Promise.resolve({ id: ID }),
      searchParams: Promise.resolve({}),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue(contexto("ADMIN_MUNICIPAL"));
  intervencionConReferenciasMock.mockResolvedValue({
    intervencion: intervencion(),
    referencias: referencias(),
  });
  historialDeIntervencionMock.mockResolvedValue(historial());
});

describe("lugar, calle y mapa (S15)", () => {
  it("el lugar es un enlace y con calle ofrece historial y mapa", async () => {
    const pagina = await html();

    expect(pagina).toContain(
      `href="/territorio?raiz=${RAIZ}&amp;nodo=${LUGAR}"`,
    );
    expect(pagina).toContain(`href="/calles/${CALLE}/historial"`);
    expect(pagina).toContain(`href="/mapa-operativo?lugar=${RAIZ}"`);
    expect(pagina).toContain(">Ver historial de la calle<");
    expect(pagina).toContain(">Ver en el mapa<");
  });

  it("sin calle no ofrece ninguna de las dos salidas", async () => {
    intervencionConReferenciasMock.mockResolvedValue({
      intervencion: intervencion({ calleId: null }),
      referencias: referencias({ calle: null }),
    });

    const pagina = await html();

    expect(pagina).not.toContain("/historial");
    expect(pagina).not.toContain("/mapa-operativo");
    expect(pagina).toContain("Sin calle");
  });

  it("cuando el lugar es la raiz, el enlace no repite el nodo", async () => {
    intervencionConReferenciasMock.mockResolvedValue({
      intervencion: intervencion({ lugarId: RAIZ }),
      referencias: referencias({ raizId: RAIZ }),
    });

    const pagina = await html();

    expect(pagina).toContain(`href="/territorio?raiz=${RAIZ}"`);
  });
});

describe("historial de cambios (S11)", () => {
  it("dice que cambio, quien y cuando en la misma linea", async () => {
    const pagina = await html();

    expect(pagina).toContain(">Historial de cambios<");
    expect(pagina).toContain(">Descripción corregida<");
    expect(pagina).toContain(
      "Antes decía «Pavimentación de la calle de acceso.».",
    );
    expect(pagina).toContain("Ana Canché · Administrador");
    expect(pagina).toContain("13 nov 2026, 10:05 a.m.");
    expect(historialDeIntervencionMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: ID }),
      expect.objectContaining({ ayuntamientoId: expect.anything() }),
    );
  });

  it("sin revisiones lo dice en vez de dejar la seccion vacia", async () => {
    historialDeIntervencionMock.mockResolvedValue({
      revisiones: [],
      registradaPor: { nombre: "Ana Canché", rol: "ADMIN_MUNICIPAL" },
    });

    const pagina = await html();

    expect(pagina).toContain(">Historial de cambios<");
    expect(pagina).toContain("Sin cambios registrados.");
  });
});
