import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VistaDeRaices } from "@/modules/territorio/ui/VistaDeRaices";
import { NoAutorizadoError } from "@/shared/lib/errores";

const mocks = vi.hoisted(() => ({
  contarContenidoDeLugares: vi.fn(),
  contextoActual: vi.fn(),
  listarCalles: vi.fn(),
  listarCallesDelMunicipio: vi.fn(),
  listarLugares: vi.fn(),
  listarRaices: vi.fn(),
  lugarPorId: vi.fn(),
  subarbol: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/shared/auth", () => ({ contextoActual: mocks.contextoActual }));

// Solo los casos de uso son dobles: el panel, el contenido y la pestana de
// Lugares son los reales, para probar el cableado de las cuentas hasta la fila.
vi.mock("@/modules/territorio", async () => ({
  ...(await vi.importActual<typeof import("@/modules/territorio/ui/acciones")>(
    "@/modules/territorio/ui/acciones",
  )),
  ...(await vi.importActual<
    typeof import("@/modules/territorio/ui/ContenidoDeLugar")
  >("@/modules/territorio/ui/ContenidoDeLugar")),
  ...(await vi.importActual<
    typeof import("@/modules/territorio/ui/PanelDeNodo")
  >("@/modules/territorio/ui/PanelDeNodo")),
  comoCalleId: (id: string) => id,
  comoLugarId: (id: string) => id,
  contarContenidoDeLugares: mocks.contarContenidoDeLugares,
  // La baja del lugar vive en la cabecera (S3 de `territorio-ux`): sus
  // zonas se leen en toda pestana, no solo en `vista=editar`.
  lecturasDeZonas: { listarZonas: async () => [] },
  listarCalles: mocks.listarCalles,
  listarCallesDelMunicipio: mocks.listarCallesDelMunicipio,
  listarLugares: mocks.listarLugares,
  listarRaices: mocks.listarRaices,
  lugarPorId: mocks.lugarPorId,
  subarbol: mocks.subarbol,
  VistaDeRaices,
}));

const { default: PaginaDeTerritorio } = await import("./page");

const RAIZ = "11111111-1111-4111-8111-111111111111";
const HIJO = "22222222-2222-4222-8222-222222222222";

const paginaCompleta = (searchParams: Record<string, string>) =>
  PaginaDeTerritorio({ searchParams: Promise.resolve(searchParams) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.contextoActual.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    origen: "web",
  });
  mocks.listarCalles.mockResolvedValue([]);
  mocks.listarCallesDelMunicipio.mockResolvedValue([]);
  mocks.listarRaices.mockResolvedValue([]);
  mocks.lugarPorId.mockResolvedValue({
    id: RAIZ,
    tipo: "cabecera",
    nombre: "Tepakan",
  });
  mocks.listarLugares.mockResolvedValue([
    { id: RAIZ, tipo: "cabecera", nombre: "Tepakan", padreId: null },
  ]);
  mocks.subarbol.mockResolvedValue([
    {
      clase: "lugar",
      id: HIJO,
      tipo: "colonia",
      nombre: "Barrio Alto",
      padreId: RAIZ,
    },
  ]);
  mocks.contarContenidoDeLugares.mockResolvedValue([
    { lugarId: HIJO, tipo: "colonia", domicilios: 7, calles: 3 },
  ]);
});

describe("Territorio: cuentas de la pestana Lugares", () => {
  it("con ?raiz= las cuentas llegan a la fila de cada hijo", async () => {
    const html = renderToStaticMarkup(await paginaCompleta({ raiz: RAIZ }));

    expect(html).toContain("Barrio Alto");
    expect(html).toContain("7 domicilios<");
    expect(html).toContain("3 calles<");
  });

  it("si el conteo falla la pagina sale igual, sin cuentas y con registro saneado", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.contarContenidoDeLugares.mockRejectedValue(
      new Error("Key (curp)=(SECRETO) ya existe"),
    );

    const html = renderToStaticMarkup(await paginaCompleta({ raiz: RAIZ }));

    expect(html).toContain("Barrio Alto");
    expect(html).not.toContain("domicilios<");
    expect(registro).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(registro.mock.calls)).not.toContain("SECRETO");
    registro.mockRestore();
  });

  it("si el conteo es un NoAutorizadoError no se traga: se propaga", async () => {
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.contarContenidoDeLugares.mockRejectedValue(new NoAutorizadoError());

    await expect(paginaCompleta({ raiz: RAIZ })).rejects.toBeInstanceOf(
      NoAutorizadoError,
    );
    expect(registro).not.toHaveBeenCalled();
    registro.mockRestore();
  });

  it("si falla la lectura de lugares el fallo se propaga", async () => {
    mocks.listarLugares.mockRejectedValue(new Error("base no disponible"));

    await expect(paginaCompleta({ raiz: RAIZ })).rejects.toThrow(
      "base no disponible",
    );
  });
});

/**
 * S3 de `territorio-ux`: «Editar» deja de ser una pestana mas. Las tres
 * acciones del lugar viven en la cabecera, plegadas, y los enlaces viejos
 * con `?vista=editar` siguen abriendo la pantalla con su pliegue.
 */
describe("Territorio: acciones del lugar en la cabecera", () => {
  it("no queda ninguna pestana que lleve a `vista=editar`", async () => {
    const html = renderToStaticMarkup(await paginaCompleta({ raiz: RAIZ }));

    expect(html).toContain("Domicilios");
    expect(html).not.toContain("vista=editar");
    expect(html).not.toMatch(/>Editar</);
  });

  it("ofrece renombrar y dar de baja plegados en la cabecera", async () => {
    const html = renderToStaticMarkup(await paginaCompleta({ raiz: RAIZ }));

    expect(html).toContain("Renombrar…");
    expect(html).toContain("Dar de baja…");
    expect(html).toContain('name="acciones-de-lugar"');
  });

  it("un enlace viejo con `vista=editar&accion=baja` abre el pliegue de la baja", async () => {
    const html = renderToStaticMarkup(
      await paginaCompleta({ raiz: RAIZ, vista: "editar", accion: "baja" }),
    );

    expect(html).toMatch(/<details[^>]*name="acciones-de-lugar"[^>]*\sopen/);
  });
});
