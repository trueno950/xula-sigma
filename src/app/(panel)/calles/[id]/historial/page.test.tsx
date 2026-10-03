import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const notFoundMock = vi.hoisted(() =>
  vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
const contextoActualMock = vi.hoisted(() => vi.fn());
const leerHistorialDeCalleMock = vi.hoisted(() => vi.fn());
const callePorIdMock = vi.hoisted(() => vi.fn());
const listarLugaresMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/territorio", () => ({
  callePorId: callePorIdMock,
  comoCalleId: (id: string) => id,
  listarLugares: listarLugaresMock,
}));
vi.mock("@/modules/historial-de-calle", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/historial-de-calle")>()),
  leerHistorialDeCalle: leerHistorialDeCalleMock,
  LineaDeTiempoDeCalle: () => null,
}));

const { default: PaginaDeHistorialDeCalle } = await import("./page");
const contexto = {
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "u", rol: "CONSULTA" as const },
  origen: "web" as const,
};
const props = {
  params: Promise.resolve({ id: "22222222-2222-4222-8222-222222222222" }),
};

const calle = {
  id: "22222222-2222-4222-8222-222222222222",
  nombre: "Calle 20",
  lugarId: "col",
  bajaEn: null,
};
const lugares = [
  { id: "raiz", nombre: "Motul", padreId: null, bajaEn: null },
  { id: "col", nombre: "Colonia Centro", padreId: "raiz", bajaEn: null },
];
/** Cada `<a>` con su href y su texto visible, sin iconos ni etiquetas. */
const anclas = (html: string) =>
  [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(
    ([, href, interior]) => ({
      href,
      texto: (interior ?? "").replace(/<svg[\s\S]*?<\/svg>/g, "").trim(),
    }),
  );
const historial = { estado: "VACIO", entradas: [] };

beforeEach(() => {
  vi.clearAllMocks();
  callePorIdMock.mockResolvedValue(calle);
  listarLugaresMock.mockResolvedValue(lugares);
});

describe("PaginaDeHistorialDeCalle", () => {
  it("no consulta el historial sin sesion", async () => {
    contextoActualMock.mockResolvedValue(null);
    await expect(PaginaDeHistorialDeCalle(props)).resolves.toBeTruthy();
    expect(leerHistorialDeCalleMock).not.toHaveBeenCalled();
  });

  it("propaga un fallo operacional sin convertirlo en 404", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    leerHistorialDeCalleMock.mockRejectedValue(new Error("base no disponible"));

    await expect(PaginaDeHistorialDeCalle(props)).rejects.toThrow(
      "base no disponible",
    );
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("convierte un id mal formado en 404 sin consultar el historial", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    const idMalFormado = { params: Promise.resolve({ id: "no-es-un-uuid" }) };

    await expect(PaginaDeHistorialDeCalle(idMalFormado)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(leerHistorialDeCalleMock).not.toHaveBeenCalled();
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("convierte una calle ajena o inexistente en 404", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    leerHistorialDeCalleMock.mockResolvedValue(null);
    await expect(PaginaDeHistorialDeCalle(props)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(leerHistorialDeCalleMock).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      contexto,
    );
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("titula con el nombre de la calle y dice que es su historial", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    leerHistorialDeCalleMock.mockResolvedValue(historial);

    const html = renderToStaticMarkup(await PaginaDeHistorialDeCalle(props));

    expect(html).toMatch(/<h1[^>]*>Calle 20</);
    expect(html).toContain("Historial de la calle");
    expect(html).not.toMatch(/<h1[^>]*>Historial de calle</);
  });

  it("enlaza a la calle en Territorio desde la migaja y el botón", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    leerHistorialDeCalleMock.mockResolvedValue(historial);

    const html = renderToStaticMarkup(await PaginaDeHistorialDeCalle(props));
    const href = `/territorio?raiz=raiz&amp;nodo=col&amp;vista=calles&amp;calle=${calle.id}`;

    expect(anclas(html)).toContainEqual({
      href,
      texto: "Volver a la calle",
    });
    expect(html).toContain("Colonia Centro");
    expect(html).toContain('aria-current="page"');
  });

  it("si solo falla la lista de lugares degrada a la migaja de Territorio y lo registra", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    leerHistorialDeCalleMock.mockResolvedValue(historial);
    listarLugaresMock.mockRejectedValue(new Error("Key (curp)=(SECRETO)"));
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});

    const html = renderToStaticMarkup(await PaginaDeHistorialDeCalle(props));

    expect(html).toMatch(/<h1[^>]*>Calle 20</);
    expect(anclas(html)).toContainEqual({
      href: "/territorio",
      texto: "Volver a Territorio",
    });
    expect(html).not.toContain("Colonia Centro");
    expect(registro).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(registro.mock.calls)).not.toContain("SECRETO");
    registro.mockRestore();
  });

  it("un fallo de la lectura de la calle no se traga", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    leerHistorialDeCalleMock.mockResolvedValue(historial);
    callePorIdMock.mockRejectedValue(new Error("base no disponible"));

    await expect(PaginaDeHistorialDeCalle(props)).rejects.toThrow(
      "base no disponible",
    );
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("convierte una calle que ya no se puede leer en 404", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    leerHistorialDeCalleMock.mockResolvedValue(historial);
    callePorIdMock.mockResolvedValue(null);

    await expect(PaginaDeHistorialDeCalle(props)).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});
