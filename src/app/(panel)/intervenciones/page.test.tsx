import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La bandeja de S1 de `intervenciones-trazabilidad` en su direccion de
 * `intervenciones-ux` (S1-S5): el tablero por estado, sus conteos, el alta y
 * los filtros que solo ve quien administra.
 */
const contextoActualMock = vi.hoisted(() => vi.fn());
const intervencionConReferenciasMock = vi.hoisted(() => vi.fn());
const listarIntervencionesMock = vi.hoisted(() => vi.fn());
const contarIntervencionesMock = vi.hoisted(() => vi.fn());
const listarLugaresMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/intervenciones", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/intervenciones")>()),
  comoIntervencionId: (id: string) => id,
  contarIntervenciones: contarIntervencionesMock,
  intervencionConReferencias: intervencionConReferenciasMock,
  listarIntervenciones: listarIntervencionesMock,
}));
vi.mock("@/modules/territorio", () => ({ listarLugares: listarLugaresMock }));

const { default: PaginaDeIntervenciones } = await import("./page");

const ID = "3f1c8a90-3333-4333-8333-333333333333";
const LUGAR = "22222222-2222-4222-8222-222222222222";

const intervencion = {
  id: ID,
  tipo: "OBRA" as const,
  estado: "PLANIFICADA" as const,
  fechaDeOcurrencia: "2026-01-15",
  lugarId: LUGAR,
  calleId: null,
  reporteId: null,
  descripcion: "Rehabilitacion del parque municipal",
  registradoPorUsuarioId: "usuario-1",
  capturadoEn: new Date("2026-03-01T12:00:00Z"),
  actualizadoEn: new Date("2026-03-02T12:00:00Z"),
};

const conteos = {
  porEstado: { PLANIFICADA: 3, EN_EJECUCION: 1, FINALIZADA: 0, CANCELADA: 0 },
  total: 4,
};

const contexto = (rol: "ADMIN_MUNICIPAL" | "OPERADOR") => ({
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue(contexto("ADMIN_MUNICIPAL"));
  listarIntervencionesMock.mockResolvedValue([intervencion]);
  contarIntervencionesMock.mockResolvedValue(conteos);
  listarLugaresMock.mockResolvedValue([
    { id: LUGAR, nombre: "Centro", tipo: "colonia" },
  ]);
});

describe("bandeja de intervenciones", () => {
  const props = (searchParams: Record<string, string> = {}) => ({
    searchParams: Promise.resolve(searchParams),
  });

  it("pinta el tablero con el alta y el enlace de cada obra", async () => {
    const html = renderToStaticMarkup(await PaginaDeIntervenciones(props()));

    expect(html).toContain(">Intervenciones</h1>");
    expect(html).not.toContain(
      "La bandeja de intervenciones todavía no está disponible.",
    );
    expect(html).toContain(">Obra<");
    expect(html).toContain("INT-3F1C");
    expect(html).toContain(`href="/intervenciones/${ID}"`);
    expect(html).toContain("Registrar intervención");
    expect(html).toContain("agrupadas por el estado en que están");
  });

  it("S2: los conteos salen del servidor, no de las filas de la pagina", async () => {
    const html = renderToStaticMarkup(await PaginaDeIntervenciones(props()));

    expect(contarIntervencionesMock).toHaveBeenCalledTimes(1);
    expect(html).toContain("4 intervenciones");
    expect(html).toContain("3 planificadas");
    expect(html).toContain("1 en ejecución");
  });

  it("S2: pide los conteos con los filtros puestos y sin el estado", async () => {
    await PaginaDeIntervenciones(
      props({ estado: "PLANIFICADA", tipo: "PAVIMENTACION" }),
    );

    expect(contarIntervencionesMock).toHaveBeenCalledWith(
      { tipo: "PAVIMENTACION" },
      expect.objectContaining({ usuario: expect.any(Object) }),
    );
  });

  it("pasa los filtros de la URL al caso de uso", async () => {
    await PaginaDeIntervenciones(
      props({ estado: "FINALIZADA", tipo: "PAVIMENTACION" }),
    );

    expect(listarIntervencionesMock).toHaveBeenCalledWith(
      { estado: "FINALIZADA", tipo: "PAVIMENTACION" },
      expect.objectContaining({ usuario: expect.any(Object) }),
    );
  });

  it("descarta un filtro que no pertenece a su catalogo sin perder los otros", async () => {
    await PaginaDeIntervenciones(
      props({ estado: "INVENTADO", tipo: "PAVIMENTACION" }),
    );

    expect(listarIntervencionesMock).toHaveBeenCalledWith(
      { tipo: "PAVIMENTACION" },
      expect.anything(),
    );
  });

  it("un rol sin administracion ve la bandeja y no el alta", async () => {
    contextoActualMock.mockResolvedValue(contexto("OPERADOR"));

    const html = renderToStaticMarkup(await PaginaDeIntervenciones(props()));

    expect(html).toContain(">Intervenciones</h1>");
    expect(html).not.toContain('href="/intervenciones/alta"');
    expect(html).toContain("el rol de administrador municipal");
  });

  it("pinta el error que dejo el alta", async () => {
    const html = renderToStaticMarkup(
      await PaginaDeIntervenciones(
        props({ error: "Ese lugar o esa calle no existe en su municipio." }),
      ),
    );

    expect(html).toContain("Ese lugar o esa calle no existe en su municipio.");
  });
});
