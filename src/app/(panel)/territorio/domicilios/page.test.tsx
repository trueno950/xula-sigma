import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  contextoActual: vi.fn(),
  listarRaices: vi.fn(),
  registroDeDomicilios: vi.fn(),
}));

vi.mock("@/shared/auth", () => ({ contextoActual: mocks.contextoActual }));

vi.mock("@/modules/territorio", async () => ({
  ...(await vi.importActual<typeof import("@/modules/territorio")>(
    "@/modules/territorio",
  )),
  listarRaices: mocks.listarRaices,
  registroDeDomicilios: mocks.registroDeDomicilios,
}));

const { TAMANO_DE_PAGINA } = await import("@/modules/territorio");
const { default: PaginaDeDomicilios } = await import("./page");

const contexto = {
  ayuntamientoId: "motul",
  usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const raiz = {
  id: "11111111-1111-4111-8111-111111111111",
  tipo: "cabecera" as const,
  nombre: "Tepakan",
  padreId: null,
  bajaEn: null,
};

const render = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await PaginaDeDomicilios({
      searchParams: Promise.resolve(searchParams),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  mocks.contextoActual.mockResolvedValue(contexto);
  mocks.listarRaices.mockResolvedValue([raiz]);
  mocks.registroDeDomicilios.mockResolvedValue({
    domicilios: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        calle: "Calle 21",
        calleId: "33333333-3333-4333-8333-333333333333",
        numero: "5",
        lugar: "Centro",
        lugarId: "22222222-2222-4222-8222-222222222222",
      },
    ],
    hayMas: false,
  });
});

describe("PaginaDeDomicilios", () => {
  /**
   * `?raiz=` con un uuid que no es raiz del municipio -una colonia, uno de
   * otro municipio, uno inexistente-: el filtro se aplico igual y el
   * registro vuelve vacio, asi que el vacio tiene que seguir siendo por
   * filtro. Buscar el nombre en `listarRaices` y rendirse si no esta
   * reintroduce el vacio inicial por otra puerta.
   */
  it("una raiz que no esta en el catalogo sigue siendo vacio por filtro", async () => {
    mocks.registroDeDomicilios.mockResolvedValue({
      domicilios: [],
      hayMas: false,
    });

    const html = await render({
      raiz: "99999999-9999-4999-8999-999999999999",
    });

    expect(html).not.toContain("Todavía no hay domicilios registrados");
  });

  /**
   * El vacio por filtro de `estadoDeLista.ts`, que documenta el caso que lo
   * origino: confundirlo con el vacio inicial manda a dar de alta algo que
   * ya existe. Filtrar por asentamiento es filtrar, aunque el filtro no sea
   * texto escrito.
   */
  it("un asentamiento sin domicilios es vacio por filtro, no vacio inicial", async () => {
    mocks.registroDeDomicilios.mockResolvedValue({
      domicilios: [],
      hayMas: false,
    });

    const html = await render({ raiz: raiz.id });

    expect(html).toContain("Sin resultados para");
    expect(html).toContain("Tepakan");
    expect(html).not.toContain("Todavía no hay domicilios registrados");
  });

  it("compone el registro con la migaja de vuelta a /territorio", async () => {
    const html = await render();

    expect(html).toContain("Calle 21 #5");
    expect(html).toContain('href="/territorio"');
    expect(html).toContain('aria-current="page"');
  });

  it("el limite sale del default cuando la URL no lo trae", async () => {
    await render();

    expect(mocks.registroDeDomicilios).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ ayuntamientoId: "motul" }),
      TAMANO_DE_PAGINA,
    );
  });

  it("pasa el limite de la URL al caso de uso", async () => {
    await render({ limite: String(TAMANO_DE_PAGINA * 2) });

    expect(mocks.registroDeDomicilios).toHaveBeenCalledWith(
      {},
      expect.anything(),
      TAMANO_DE_PAGINA * 2,
    );
  });

  it("traduce la URL a los filtros del caso de uso", async () => {
    await render({ q: "Calle 21", numero: "5", raiz: raiz.id });

    expect(mocks.registroDeDomicilios).toHaveBeenCalledWith(
      { raizId: raiz.id, busqueda: "Calle 21", numero: "5" },
      expect.anything(),
      TAMANO_DE_PAGINA,
    );
  });

  /**
   * Hallazgo 11: el campo principal busca por calle y numero juntos; un
   * enlace viejo con `?q=` sigue abriendo, ahora con la busqueda general.
   */
  it("el campo principal se rotula para calle y numero, con su chip de busqueda", async () => {
    const html = await render({ q: "Calle 22 265" });

    expect(html).toMatch(
      /<label[^>]*for="q"[^>]*>Buscar domicilio \(calle y número\)<\/label>/,
    );
    expect(html).toMatch(/<input[^>]*name="q"[^>]*value="Calle 22 265"/);
    expect(html).toContain("Búsqueda: Calle 22 265");
    expect(html).not.toContain("Calle: Calle 22 265");
    expect(html).toMatch(/<label[^>]*for="numero"[^>]*>Número<\/label>/);
  });

  it("avisa en la pantalla cuantas palabras quedaron fuera del tope de la busqueda", async () => {
    const html = await render({ q: "Calle 22 265 entre 21 y 23 norte" });

    expect(html).toContain("se ignoraron 2 palabras");
  });

  it("carga las raices para el select del filtro", async () => {
    const html = await render();

    expect(mocks.listarRaices).toHaveBeenCalledTimes(1);
    expect(html).toContain("Tepakan (cabecera)");
  });

  it("sin sesion no consulta el registro y lo dice", async () => {
    mocks.contextoActual.mockResolvedValue(null);

    const html = await render();

    expect(mocks.registroDeDomicilios).not.toHaveBeenCalled();
    expect(html).toContain("No se pudo determinar su sesión.");
  });

  it("ofrece agregar un domicilio con un rol de escritura", async () => {
    const html = await render();

    expect(html).toContain('href="/territorio?accion=domicilio"');
  });

  it("no ofrece agregar con CONSULTA", async () => {
    mocks.contextoActual.mockResolvedValue({
      ...contexto,
      usuario: { ...contexto.usuario, rol: "CONSULTA" },
    });

    const html = await render();

    expect(html).not.toContain('href="/territorio?accion=domicilio"');
  });
});
