import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoActualMock = vi.hoisted(() => vi.fn());
const listarLugaresMock = vi.hoisted(() => vi.fn());
const listarCallesMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/territorio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/territorio")>()),
  listarLugares: listarLugaresMock,
  listarCalles: listarCallesMock,
}));
vi.mock("../../actions/altaDeIntervencionAction", () => ({
  altaDeIntervencionAction: "alta-action",
}));

const { default: PaginaDeAltaDeIntervencion } = await import("./page");

const ASENTAMIENTO = "22222222-2222-4222-8222-222222222222";
const COLONIA = "33333333-3333-4333-8333-333333333333";
const CALLE = "44444444-4444-4444-8444-444444444444";

const contexto = (rol: "ADMIN_MUNICIPAL" | "OPERADOR") => ({
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const props = (searchParams: Record<string, string> = {}) => ({
  searchParams: Promise.resolve(searchParams),
});

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue(contexto("ADMIN_MUNICIPAL"));
  listarLugaresMock.mockResolvedValue([
    {
      id: ASENTAMIENTO,
      nombre: "San Juan",
      tipo: "comisaria",
      padreId: null,
    },
    { id: COLONIA, nombre: "Centro", tipo: "colonia", padreId: ASENTAMIENTO },
  ]);
  listarCallesMock.mockImplementation(async (lugarId: string) =>
    lugarId === ASENTAMIENTO ? [{ id: CALLE, nombre: "Calle 20" }] : [],
  );
});

describe("alta de intervencion", () => {
  it("ofrece los tipos del catalogo y los lugares del municipio", async () => {
    const html = renderToStaticMarkup(
      await PaginaDeAltaDeIntervencion(props()),
    );

    expect(html).toContain("Registrar intervención");
    expect(html).toContain(">Pavimentación</option>");
    expect(html).toContain(">San Juan (comisaría)</option>");
    expect(html).toContain(">Centro (colonia)</option>");
    expect(html).toContain(">Calle 20</option>");
    expect(html).toContain('name="fechaDeOcurrencia"');
    expect(html).not.toContain("ayuntamientoId");
  });

  /**
   * S6 de `intervenciones-ux`: las calles se piden una vez por asentamiento
   * -no por lugar-, y cada una viaja con el `optgroup` que la contiene, que es
   * lo que deja elegir con coherencia sin JavaScript.
   */
  it("agrupa las calles por el asentamiento que las tiene en su catalogo", async () => {
    const html = renderToStaticMarkup(
      await PaginaDeAltaDeIntervencion(props()),
    );

    expect(html).toContain('<optgroup label="San Juan">');
    expect(listarCallesMock).toHaveBeenCalledWith(
      ASENTAMIENTO,
      expect.anything(),
    );
    expect(listarCallesMock).not.toHaveBeenCalledWith(
      COLONIA,
      expect.anything(),
    );
  });

  it("pinta el error que dejo la accion", async () => {
    const html = renderToStaticMarkup(
      await PaginaDeAltaDeIntervencion(
        props({ error: "Ese lugar o esa calle no existe en su municipio." }),
      ),
    );

    expect(html).toContain("Ese lugar o esa calle no existe en su municipio.");
  });

  it("un rol que no administra intervenciones no llega al formulario", async () => {
    contextoActualMock.mockResolvedValue(contexto("OPERADOR"));

    const html = renderToStaticMarkup(
      await PaginaDeAltaDeIntervencion(props()),
    );

    expect(html).toContain(
      "Su rol no tiene permiso para registrar intervenciones.",
    );
    expect(html).not.toContain('name="fechaDeOcurrencia"');
    expect(listarLugaresMock).not.toHaveBeenCalled();
  });

  it("sin sesion no resuelve lugares", async () => {
    contextoActualMock.mockResolvedValue(null);

    const html = renderToStaticMarkup(
      await PaginaDeAltaDeIntervencion(props()),
    );

    expect(html).toContain("No se pudo determinar su sesión.");
    expect(listarLugaresMock).not.toHaveBeenCalled();
  });
});
