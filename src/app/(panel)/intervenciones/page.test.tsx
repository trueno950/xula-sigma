import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * La bandeja de S1 de `intervenciones-trazabilidad`, en su propia pagina: el
 * listado, sus filtros por URL y el alta que solo ve quien administra.
 */
const contextoActualMock = vi.hoisted(() => vi.fn());
const intervencionConReferenciasMock = vi.hoisted(() => vi.fn());
const listarIntervencionesMock = vi.hoisted(() => vi.fn());
const listarLugaresMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/intervenciones", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/intervenciones")>()),
  comoIntervencionId: (id: string) => id,
  intervencionConReferencias: intervencionConReferenciasMock,
  listarIntervenciones: listarIntervencionesMock,
}));
vi.mock("@/modules/territorio", () => ({ listarLugares: listarLugaresMock }));

const { default: PaginaDeIntervenciones } = await import("./page");

const ID = "33333333-3333-4333-8333-333333333333";
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

const contexto = (rol: "ADMIN_MUNICIPAL" | "OPERADOR") => ({
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue(contexto("ADMIN_MUNICIPAL"));
  listarIntervencionesMock.mockResolvedValue([intervencion]);
  listarLugaresMock.mockResolvedValue([
    { id: LUGAR, nombre: "Centro", tipo: "colonia" },
  ]);
});

describe("bandeja de intervenciones", () => {
  const props = (searchParams: Record<string, string> = {}) => ({
    searchParams: Promise.resolve(searchParams),
  });

  beforeEach(() => {
    listarIntervencionesMock.mockResolvedValue([intervencion]);
    listarLugaresMock.mockResolvedValue([
      {
        id: "22222222-2222-4222-8222-222222222222",
        nombre: "Centro",
        tipo: "colonia",
      },
    ]);
  });

  it("reemplaza el texto de no disponible por el listado con su enlace", async () => {
    const html = renderToStaticMarkup(await PaginaDeIntervenciones(props()));

    expect(html).toContain(">Intervenciones</h1>");
    expect(html).not.toContain(
      "La bandeja de intervenciones todavía no está disponible.",
    );
    expect(html).toContain(">Obra<");
    expect(html).toContain(`href="/intervenciones/${ID}"`);
    expect(html).toContain("Registrar intervención");
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
