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
  usePathname: () => null,
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

  it("ofrece cerrar la sesion y el rol desde el lateral", async () => {
    const html = await pintar();
    const lateral = html.slice(
      html.indexOf("<aside"),
      html.indexOf("</aside>"),
    );

    expect(lateral).toContain("Cerrar sesión");
    expect(lateral).toContain("Administrador");
  });

  it("muestra el municipio en el lateral y el contenido al lado", async () => {
    const html = await pintar();
    const lateral = html.slice(
      html.indexOf("<aside"),
      html.indexOf("</aside>"),
    );

    expect(lateral).toContain("Motul");
    expect(html).toContain("contenido");
  });

  it("encierra la barra superior del movil en un landmark", async () => {
    const html = await pintar();
    const desde = html.indexOf("<header");
    const cabecera = html.slice(desde, html.indexOf("</header>"));

    expect(desde).toBeGreaterThan(-1);
    expect(cabecera).toMatch(/^<header[^>]*class="[^"]*lg:hidden/);
    expect(cabecera).toMatch(/<a[^>]*aria-label="Motul, inicio"[^>]*href="\/"/);
  });

  it("no duplica el landmark de la barra inferior", async () => {
    const html = await pintar();
    const cabecera = html.slice(
      html.indexOf("<header"),
      html.indexOf("</header>"),
    );

    expect(cabecera).not.toContain("<nav");
    expect(html.match(/aria-label="Navegación principal"/g)).toHaveLength(1);
  });

  it("solo ofrece los modulos que el rol puede usar", async () => {
    contextoActualMock.mockResolvedValue({
      usuario: { id: "u2", rol: "OPERADOR" },
    });

    const html = await pintar();

    expect(html).not.toContain('href="/marca"');
    expect(html).toContain('href="/padron"');
  });

  it("sin sesion manda a la pantalla de acceso", async () => {
    contextoActualMock.mockResolvedValue(null);

    await expect(pintar()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/acceso");
  });
});
