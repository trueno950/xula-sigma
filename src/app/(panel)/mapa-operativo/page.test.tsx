import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoActualMock = vi.hoisted(() => vi.fn());
const agregarMapaMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/mapa-operativo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/mapa-operativo")>()),
  agregarMapa: agregarMapaMock,
  MapaOperativo: () => <div>snapshot del mapa</div>,
}));
vi.mock("@/shared/ui/EstadoEnVivo", () => ({
  EstadoEnVivo: () => <div>estado en vivo</div>,
}));

const { default: PaginaDeMapaOperativo } = await import("./page");
const { NavegacionDeModulos } = await import("../NavegacionDeModulos");

const contexto = {
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol: "CONSULTA" as const },
  origen: "web" as const,
};
const mapa = {
  estado: "VACIO" as const,
  marcadores: [],
  cobertura: [],
  conteos: { reportes: 0, intervenciones: 0, total: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PaginaDeMapaOperativo", () => {
  it("no consulta el snapshot sin una sesion resuelta", async () => {
    contextoActualMock.mockResolvedValue(null);

    const html = renderToStaticMarkup(
      await PaginaDeMapaOperativo({ searchParams: Promise.resolve({}) }),
    );

    expect(html).toContain("No se pudo determinar su sesión.");
    expect(agregarMapaMock).not.toHaveBeenCalled();
  });

  it("compone el snapshot bajo el tenant de la sesion y la isla viva", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    agregarMapaMock.mockResolvedValue(mapa);

    const html = renderToStaticMarkup(
      await PaginaDeMapaOperativo({
        searchParams: Promise.resolve({ estado: "RECIBIDO" }),
      }),
    );

    expect(agregarMapaMock).toHaveBeenCalledWith(contexto, {
      tipo: undefined,
      estado: "RECIBIDO",
      area: undefined,
    });
    expect(html).toContain("snapshot del mapa");
    expect(html).toContain("estado en vivo");
  });
});

describe("navegacion del mapa operativo", () => {
  it("ofrece el mapa a cualquier rol autenticado y lo marca activo", () => {
    const html = renderToStaticMarkup(
      <NavegacionDeModulos ruta="/mapa-operativo" forma="fila" />,
    );

    expect(html).toContain('href="/mapa-operativo"');
    expect(html).toContain("Mapa operativo");
    expect(html).toContain('aria-current="page"');
  });
});
