import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLASES_DE_DATO } from "@/shared/ui";

const notFoundMock = vi.hoisted(() =>
  vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
const contextoActualMock = vi.hoisted(() => vi.fn());
const intervencionPorIdMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/intervenciones", () => ({
  AccionesDeIntervencion: () => <div>acciones de estado</div>,
  FormularioDeCorreccion: () => <div>formulario de correccion</div>,
  comoIntervencionId: (id: string) => id,
  intervencionPorId: intervencionPorIdMock,
}));

const { default: PaginaDeIntervencion } = await import(
  "./intervenciones/[id]/page"
);
const { default: PaginaDeIntervenciones } = await import(
  "./intervenciones/page"
);
const { NavegacionDeModulos } = await import("./NavegacionDeModulos");

const ID = "33333333-3333-4333-8333-333333333333";
const intervencion = {
  id: ID,
  tipo: "OBRA" as const,
  estado: "PLANIFICADA" as const,
  fechaDeOcurrencia: "2026-01-15",
  lugarId: "22222222-2222-4222-8222-222222222222",
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

const props = (id = ID) => ({
  params: Promise.resolve({ id }),
  searchParams: Promise.resolve({}),
});

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue(contexto("ADMIN_MUNICIPAL"));
});

describe("ficha de intervencion", () => {
  it("trata una fila invisible por tenant como no encontrada", async () => {
    intervencionPorIdMock.mockResolvedValue(null);

    await expect(PaginaDeIntervencion(props())).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("muestra ocurrencia, captura y correccion separadas", async () => {
    intervencionPorIdMock.mockResolvedValue(intervencion);

    const html = renderToStaticMarkup(await PaginaDeIntervencion(props()));

    expect(html).toContain("Fecha de ocurrencia");
    expect(html).toContain("2026-01-15");
    expect(html).toContain(`<dd class="${CLASES_DE_DATO}">2026-01-15</dd>`);
    expect(html).toContain("Capturado en");
    expect(html).toContain(`<dd class="${CLASES_DE_DATO}">1 mar 2026`);
    expect(html).toContain("1 mar 2026");
    expect(html).toContain(`<dd class="${CLASES_DE_DATO}">2 mar 2026`);
    expect(html).toContain("formulario de correccion");
    expect(html).toContain("acciones de estado");
  });

  it("no muestra administracion a un operador", async () => {
    contextoActualMock.mockResolvedValue(contexto("OPERADOR"));
    intervencionPorIdMock.mockResolvedValue(intervencion);

    const html = renderToStaticMarkup(await PaginaDeIntervencion(props()));

    expect(html).not.toContain("formulario de correccion");
    expect(html).not.toContain("acciones de estado");
  });
});

describe("navegacion de intervenciones", () => {
  it("ofrece el modulo y lo marca como activo", () => {
    const html = renderToStaticMarkup(
      <NavegacionDeModulos ruta="/intervenciones" forma="fila" />,
    );

    expect(html).toContain('href="/intervenciones"');
    expect(html).toContain("Intervenciones");
    expect(html).toContain('aria-current="page"');
  });
});

describe("raiz de intervenciones", () => {
  it("informa que la bandeja no esta disponible sin resolver el contexto", async () => {
    const html = renderToStaticMarkup(await PaginaDeIntervenciones());

    expect(html).toContain(">Intervenciones</h1>");
    expect(html).toContain(
      "La bandeja de intervenciones todavia no esta disponible.",
    );
    expect(contextoActualMock).not.toHaveBeenCalled();
  });
});
