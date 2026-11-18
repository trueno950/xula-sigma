import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoActualMock = vi.hoisted(() => vi.fn());
const listarConstanciasMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/constancias", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/constancias")>()),
  ListadoDeConstancias: () => <div>listado de constancias</div>,
  listarConstancias: listarConstanciasMock,
}));

const { default: PaginaDeConstancias } = await import("./page");

const contextoDe = (rol: "OPERADOR" | "ADMIN_MUNICIPAL" | "CONSULTA") => ({
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const pintar = async (rol: "OPERADOR" | "ADMIN_MUNICIPAL" | "CONSULTA") => {
  contextoActualMock.mockResolvedValue(contextoDe(rol));

  return renderToStaticMarkup(
    await PaginaDeConstancias({ searchParams: Promise.resolve({}) }),
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  listarConstanciasMock.mockResolvedValue({ constancias: [], hayMas: false });
});

describe("pagina de constancias", () => {
  it("un OPERADOR ve el aviso de permiso y no la configuracion del bloque de firma", async () => {
    const html = await pintar("OPERADOR");

    expect(html).toContain(
      "Su rol no permite gestionar el bloque de firma de las constancias",
    );
    expect(html).toContain("Se requiere el rol de administrador municipal");
    expect(html).not.toContain('href="/constancias/configuracion"');
  });

  it("un ADMIN_MUNICIPAL ve la configuracion del bloque de firma y no el aviso", async () => {
    const html = await pintar("ADMIN_MUNICIPAL");

    expect(html).toContain('href="/constancias/configuracion"');
    expect(html).not.toContain("Su rol no permite");
  });

  it("el mensaje redactado por la accion de emision llega a la pantalla", async () => {
    contextoActualMock.mockResolvedValue(contextoDe("ADMIN_MUNICIPAL"));

    const html = renderToStaticMarkup(
      await PaginaDeConstancias({
        searchParams: Promise.resolve({ error: "No se pudo emitir." }),
      }),
    );

    expect(html).toContain("No se pudo emitir.");
  });
});

describe("la accion de emitir en el listado (S3)", () => {
  it("quien puede escribir ve «Emitir constancia» en la cabecera", async () => {
    const html = await pintar("ADMIN_MUNICIPAL");

    expect(html).toContain('href="/constancias/emitir"');
    expect(html).toContain("Emitir constancia");
  });

  it("un OPERADOR tambien emite: es trabajo de mostrador", async () => {
    const html = await pintar("OPERADOR");

    expect(html).toContain('href="/constancias/emitir"');
    expect(html).not.toContain('href="/constancias/configuracion"');
  });

  it("un CONSULTA no ve emitir, porque `/constancias/emitir` se lo rechaza", async () => {
    const html = await pintar("CONSULTA");

    expect(html).not.toContain('href="/constancias/emitir"');
  });
});
