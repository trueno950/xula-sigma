import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoActualMock = vi.hoisted(() => vi.fn());
const agregarMapaMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/mapa-operativo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/mapa-operativo")>()),
  agregarMapa: agregarMapaMock,
  MapaOperativo: ({ panel }: { panel: string }) => (
    <div>snapshot del mapa {panel}</div>
  ),
}));
vi.mock("@/shared/ui/EstadoEnVivo", () => ({
  EstadoEnVivo: ({ variante }: { variante?: string }) => (
    <div>estado en vivo {variante}</div>
  ),
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
  territorios: [],
  territorioElegido: null,
  caja: null,
  marcadores: [],
  cobertura: [],
  conteos: { reportes: 0, intervenciones: 0, total: 0 },
  leyenda: { tipos: [], estados: [], atrasados: 0, total: 0 },
  sinUbicar: [],
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
        searchParams: Promise.resolve({
          estado: "RECIBIDO",
          lugar: "22222222-2222-4222-8222-222222222222",
        }),
      }),
    );

    expect(agregarMapaMock).toHaveBeenCalledWith(contexto, {
      tipo: undefined,
      estado: "RECIBIDO",
      area: undefined,
      lugar: "22222222-2222-4222-8222-222222222222",
    });
    expect(html).toContain("snapshot del mapa en-el-mapa");
    expect(html).toContain("estado en vivo compacta");
  });

  /**
   * S1 y S4: la cabecera pasa a llevar la descripcion de la pantalla, y la
   * pestana elegida llega al mapa desde `?panel=`. Sin esto la URL cambiaria y
   * el panel seguiria mostrando la lista de siempre.
   */
  it("compone la descripcion de la cabecera y la pestana pedida en la URL", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    agregarMapaMock.mockResolvedValue(mapa);

    const html = renderToStaticMarkup(
      await PaginaDeMapaOperativo({
        searchParams: Promise.resolve({ panel: "sin-ubicar" }),
      }),
    );

    expect(html).toContain(
      "Dónde están los reportes y las obras abiertas del municipio, qué lleva demasiado tiempo y qué no se puede dibujar todavía.",
    );
    expect(html).toContain("snapshot del mapa sin-ubicar");
  });
});

describe("navegacion del mapa operativo", () => {
  it("ofrece el mapa a cualquier rol autenticado y lo marca activo", () => {
    const html = renderToStaticMarkup(
      <NavegacionDeModulos ruta="/mapa-operativo" rol="OPERADOR" />,
    );

    expect(html).toContain('href="/mapa-operativo"');
    expect(html).toContain("Mapa operativo");
    expect(html).toContain('aria-current="page"');
  });
});
