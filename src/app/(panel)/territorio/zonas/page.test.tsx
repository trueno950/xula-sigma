import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  callesDeZona: vi.fn(),
  contextoActual: vi.fn(),
  domiciliosDeZona: vi.fn(),
  listarCalles: vi.fn(),
  listarRaices: vi.fn(),
  listarZonas: vi.fn(),
  notFound: vi.fn(),
  zonaPorId: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/shared/auth", () => ({ contextoActual: mocks.contextoActual }));

vi.mock("./mensajesDeConfirmacion", () => ({
  MENSAJE_DE_CONFIRMACION_DE_ZONAS: {},
}));

vi.mock("@/modules/territorio", () => ({
  comoLugarId: (id: string) => id,
  comoZonaId: (id: string) => id,
  domiciliosDeZona: mocks.domiciliosDeZona,
  lecturasDeZonas: {
    callesDeZona: mocks.callesDeZona,
    listarZonas: mocks.listarZonas,
    zonaPorId: mocks.zonaPorId,
  },
  listarCalles: mocks.listarCalles,
  listarRaices: mocks.listarRaices,
}));

vi.mock("@/modules/territorio/ui/actions/altaDeZonaAction", () => ({
  altaDeZonaAction: vi.fn(),
}));
vi.mock("@/modules/territorio/ui/actions/renombrarZonaAction", () => ({
  renombrarZonaAction: vi.fn(),
}));
vi.mock("@/modules/territorio/ui/actions/darDeBajaZonaAction", () => ({
  darDeBajaZonaAction: vi.fn(),
}));
vi.mock("@/modules/territorio/ui/actions/agregarCalleAZonaAction", () => ({
  agregarCalleAZonaAction: vi.fn(),
}));
vi.mock("@/modules/territorio/ui/actions/quitarCalleDeZonaAction", () => ({
  quitarCalleDeZonaAction: vi.fn(),
}));

const { default: PaginaDeZonas } = await import("./page");

const RAIZ = "11111111-1111-4111-8111-111111111111";
const ZONA = "22222222-2222-4222-8222-222222222222";

const pagina = (searchParams: Record<string, string>) =>
  PaginaDeZonas({ searchParams: Promise.resolve(searchParams) });

const render = async (searchParams: Record<string, string>) =>
  renderToStaticMarkup(await pagina(searchParams));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.contextoActual.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    origen: "web",
  });
  mocks.listarRaices.mockResolvedValue([
    {
      id: RAIZ,
      tipo: "cabecera",
      nombre: "Motul",
      padreId: null,
      bajaEn: null,
    },
  ]);
  mocks.listarZonas.mockResolvedValue([
    {
      id: ZONA,
      nombre: "Zona Norte",
      lugarId: RAIZ,
      asentamiento: "Motul",
      calles: 3,
    },
  ]);
  mocks.domiciliosDeZona.mockResolvedValue([]);
  mocks.callesDeZona.mockResolvedValue([]);
  mocks.listarCalles.mockResolvedValue([]);
});

/**
 * Z1 y Z2 de `odd/tasks/territorio-ux.md` (S12 y S13) en la pagina: el alta
 * es estado de URL (`?accion=nueva`) y la lista dice cuantas calles tiene
 * cada zona.
 */
describe("la pagina de zonas", () => {
  it("sin accion, el alta es un boton y la lista empieza enseguida", async () => {
    const html = await render({});

    expect(html).toMatch(
      /<a\b[^>]*href="\/territorio\/zonas\?accion=nueva#panel-de-alta"/,
    );
    expect(html).not.toContain('id="zona-asentamiento"');
    expect(html).toContain("Zona Norte");
  });

  it("con ?accion=nueva abre el alta en su panel, arriba de la lista", async () => {
    const html = await render({ accion: "nueva" });

    expect(html).toContain('id="panel-de-alta"');
    expect(html).toContain('id="zona-asentamiento"');
    expect(html.indexOf('id="panel-de-alta"')).toBeLessThan(
      html.indexOf("Zona Norte"),
    );
    expect(html).not.toContain(
      'href="/territorio/zonas?accion=nueva#panel-de-alta"',
    );
  });

  it("cada zona llega con su numero de calles", async () => {
    const html = await render({});

    expect(html).toContain("Zona Norte, Motul, 3 calles");
    expect(html).toMatch(/>Calles</);
  });

  it("un ?accion que no es del vocabulario se ignora, no es 404", async () => {
    const html = await render({ accion: "borrar-todo" });

    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(html).toContain("Zona Norte");
    expect(html).not.toContain('id="zona-asentamiento"');
  });

  it("el filtro por asentamiento sigue llegando a la lectura", async () => {
    await render({ raiz: RAIZ });

    expect(mocks.listarZonas).toHaveBeenCalledWith(RAIZ, expect.anything());
  });

  it("una zona de otro municipio sigue siendo 404", async () => {
    await pagina({ zona: "no-es-uuid" });

    expect(mocks.notFound).toHaveBeenCalledTimes(1);
  });

  it("el detalle de una zona sigue abriendo con sus calles", async () => {
    mocks.zonaPorId.mockResolvedValue({
      id: ZONA,
      nombre: "Zona Norte",
      lugarId: RAIZ,
      asentamiento: "Motul",
    });
    mocks.callesDeZona.mockResolvedValue([
      { id: "44444444-4444-4444-8444-444444444444", nombre: "Calle 20" },
    ]);

    const html = await render({ zona: ZONA });

    expect(html).toMatch(/<h1[^>]*>Zona Norte<\/h1>/);
    expect(html).toContain("Calle 20");
    expect(mocks.listarZonas).not.toHaveBeenCalled();
  });

  it("un rol de consulta no ve el alta ni con ?accion=nueva", async () => {
    mocks.contextoActual.mockResolvedValue({
      ayuntamientoId: "motul",
      usuario: { id: "u1", rol: "CONSULTA" },
      origen: "web",
    });

    const html = await render({ accion: "nueva" });

    expect(html).not.toContain('id="zona-asentamiento"');
    expect(html).not.toContain("accion=nueva");
  });
});
