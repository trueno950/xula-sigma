import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoActualMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/modules/constancias", () => ({
  documentosDelAyuntamiento: vi.fn(),
  FormularioDeEmision: () => null,
}));

const { default: PaginaDeEmisionDeConstancia } = await import("./page");

const contexto = {
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol: "OPERADOR" as const },
  origen: "web" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PaginaDeEmisionDeConstancia", () => {
  it("el estado sin persona lleva encabezado propio y conserva la salida al padrón", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    const html = renderToStaticMarkup(
      await PaginaDeEmisionDeConstancia({ searchParams: Promise.resolve({}) }),
    );

    expect(html).toMatch(/<h1[^>]*>Emitir constancia<\/h1>/);
    expect(html).toContain(
      "Elija una persona desde el padrón para emitir su constancia.",
    );
    expect(html).toContain('href="/padron"');
    expect((html.match(/<main/g) ?? []).length).toBe(1);
  });
});
