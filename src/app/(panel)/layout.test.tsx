import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const contextoActualMock = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-xula-ruta": "/padron" }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: redirectMock,
}));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/shared/tenancy/contexto", () => ({
  superficieActual: async () => "ayuntamiento",
  exigirAyuntamiento: async () => ({ nombre: "Motul", marca: {} }),
}));

const { default: LayoutDePanel } = await import("./layout");

const pintar = async () =>
  renderToStaticMarkup(await LayoutDePanel({ children: <p>contenido</p> }));

describe("layout del panel", () => {
  beforeEach(() => {
    contextoActualMock.mockReset();
    contextoActualMock.mockResolvedValue({
      usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    });
  });

  it("ofrece cerrar la sesion desde la cabecera", async () => {
    const html = await pintar();
    const cabecera = html.slice(
      html.indexOf("<header"),
      html.indexOf("</header>"),
    );

    expect(cabecera).toContain("Cerrar sesión");
  });

  it("sin sesion manda a la pantalla de acceso", async () => {
    contextoActualMock.mockResolvedValue(null);

    await expect(pintar()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/acceso");
  });
});
