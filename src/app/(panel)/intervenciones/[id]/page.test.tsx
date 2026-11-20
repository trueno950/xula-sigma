import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S10, S12-S14 de `intervenciones-ux` sobre la pagina real: el titulo lleva
 * el identificador y la insignia de la bandeja, la ficha separa el hecho del
 * registro del sistema y las acciones tienen jerarquia.
 *
 * El sujeto es la pagina: que panel se monta y cual no lo decide ella, y las
 * Server Actions se mockean porque lo que se mira es el marcado.
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

describe("cabecera de la ficha (S10)", () => {
  it("el titulo es el identificador y el estado es la insignia de la bandeja", async () => {
    const pagina = await html();

    expect(pagina).toContain(">INT-3333<");
    expect(pagina).toContain(">En ejecución<");
    expect(pagina).toContain(
      "Pavimentación · Colonia Centro (colonia) · Calle 26",
    );
    // La misma insignia de la bandeja: su icono acompania la palabra.
    expect(pagina).toMatch(/En ejecución<\/span>/);
    expect(pagina).not.toContain(">Intervención Pavimentación<");
  });
});

describe("ficha: el hecho separado del sistema (S14)", () => {
  it("agrupa los datos del hecho y deja los metadatos en su propio bloque", async () => {
    const pagina = await html();

    expect(pagina).toContain(">El hecho<");
    expect(pagina).toContain(">Fecha de ocurrencia<");
    expect(pagina).toContain("12 nov 2026");
    expect(pagina).toContain(
      ">Registro del sistema · no es un dato de la obra<",
    );
    expect(pagina).toContain(">Registrada el<");
    expect(pagina).toContain("12 nov 2026, 9:20 a.m.");
    expect(pagina).toContain(">Última actualización<");
    expect(pagina).toContain("15 nov 2026, 9:40 a.m.");
    expect(pagina).toContain(">Registrada por<");
    expect(pagina).toContain("Ana Canché · Administrador");
    expect(pagina).not.toContain("2026-11-12");
  });
});

describe("acciones (S12 y S13)", () => {
  it("muestra el panel con el siguiente paso y lo demas plegado", async () => {
    const pagina = await html();

    expect(pagina).toContain(">Acciones<");
    expect(pagina).toContain("Siguiente paso");
    expect(pagina).toContain(">Marcar finalizada<");
    expect(pagina).toContain("Corregir intervención…");
    expect(pagina).toContain("Cancelar intervención…");
    expect(pagina).not.toContain(">Cambiar estado<");
  });

  it("sin el rol que administra, el panel se sustituye por el aviso", async () => {
    contextoActualMock.mockResolvedValue(contexto("OPERADOR"));

    const pagina = await html();

    expect(pagina).toContain("Su rol no permite administrar intervenciones.");
    expect(pagina).not.toContain("Siguiente paso");
    expect(pagina).not.toContain("Corregir intervención…");
  });
});
