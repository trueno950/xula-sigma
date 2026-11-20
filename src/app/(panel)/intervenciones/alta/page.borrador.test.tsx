import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoActualMock = vi.hoisted(() => vi.fn());
const listarLugaresMock = vi.hoisted(() => vi.fn());
const listarCallesMock = vi.hoisted(() => vi.fn());
const cookieJar = vi.hoisted(() => ({
  valor: undefined as string | undefined,
}));

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/territorio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/territorio")>()),
  listarLugares: listarLugaresMock,
  listarCalles: listarCallesMock,
}));
vi.mock("../../actions/altaDeIntervencionAction", () => ({
  altaDeIntervencionAction: "alta-action",
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) =>
      nombre === "borrador-de-intervencion" && cookieJar.valor !== undefined
        ? { name: nombre, value: cookieJar.valor }
        : undefined,
  }),
}));

const { default: PaginaDeAltaDeIntervencion } = await import("./page");

const ASENTAMIENTO = "22222222-2222-4222-8222-222222222222";
const COLONIA = "33333333-3333-4333-8333-333333333333";
const CALLE = "44444444-4444-4444-8444-444444444444";
const TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const DESCRIPCION = "Bache rellenado frente al parque";

const contexto = () => ({
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
});

const BORRADOR = {
  token: TOKEN,
  campos: {
    tipo: "BACHE",
    lugarId: COLONIA,
    calleId: CALLE,
    fechaDeOcurrencia: "2026-03-02",
    descripcion: DESCRIPCION,
  },
};

const pagina = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await PaginaDeAltaDeIntervencion({
      searchParams: Promise.resolve(searchParams),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  cookieJar.valor = undefined;
  contextoActualMock.mockResolvedValue(contexto());
  listarLugaresMock.mockResolvedValue([
    { id: ASENTAMIENTO, nombre: "San Juan", tipo: "comisaria", padreId: null },
    { id: COLONIA, nombre: "Centro", tipo: "colonia", padreId: ASENTAMIENTO },
  ]);
  listarCallesMock.mockResolvedValue([{ id: CALLE, nombre: "Calle 20" }]);
});

/**
 * S8 de `intervenciones-ux`: el rechazo deja lo capturado en una cookie
 * httpOnly y la URL lleva solo el token opaco; la página lo vuelve a mostrar.
 */
describe("alta de intervención: el borrador del rechazo", () => {
  it("con el token de la URL, el formulario vuelve con lo capturado", async () => {
    cookieJar.valor = JSON.stringify(BORRADOR);

    const html = await pagina({ borrador: TOKEN });

    expect(html).toContain('value="BACHE" selected');
    expect(html).toContain(`value="${COLONIA}" selected`);
    expect(html).toContain('value="2026-03-02"');
    expect(html).toContain(`>${DESCRIPCION}</textarea>`);
  });

  it("un token que no es el de la cookie no rellena nada", async () => {
    cookieJar.valor = JSON.stringify(BORRADOR);

    const html = await pagina({
      borrador: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(html).not.toContain(DESCRIPCION);
    expect(html).not.toContain('value="2026-03-02"');
  });

  it("sin token en la URL no se lee la cookie", async () => {
    cookieJar.valor = JSON.stringify(BORRADOR);

    const html = await pagina();

    expect(html).not.toContain(DESCRIPCION);
    expect(html).toContain(">Elija primero el lugar<");
  });

  it("el error que dejó la acción sigue saliendo arriba del formulario", async () => {
    cookieJar.valor = JSON.stringify(BORRADOR);

    const html = await pagina({
      borrador: TOKEN,
      error: "La descripción debe tener al menos 10 caracteres.",
    });

    expect(html).toContain("La descripción debe tener al menos 10 caracteres.");
  });
});
