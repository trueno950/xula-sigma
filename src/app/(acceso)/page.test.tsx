import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const contextoActualMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  usePathname: () => null,
}));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("@/shared/tenancy/contexto", () => ({
  ayuntamientoActual: async () => ({ nombre: "Motul" }),
}));

const { default: PaginaDeInicio } = await import("./page");
const { NavegacionDeModulos } = await import("../(panel)/NavegacionDeModulos");

const pintar = async () => renderToStaticMarkup(await PaginaDeInicio());

const enlaces = (html: string) =>
  [...html.matchAll(/<a[^>]*href="([^"]+)"/g)].map((m) => m[1]);

describe("inicio del municipio", () => {
  beforeEach(() => {
    contextoActualMock.mockReset();
    contextoActualMock.mockResolvedValue({
      usuario: { id: "u1", rol: "ADMIN_MUNICIPAL" },
    });
  });

  it("enlaza los mismos modulos que la navegacion del panel", async () => {
    const delHub = enlaces(await pintar());
    const delPanel = enlaces(
      renderToStaticMarkup(
        <NavegacionDeModulos ruta="/" rol="ADMIN_MUNICIPAL" />,
      ),
    );

    expect(delPanel).toContain("/mapa-operativo");
    expect(delPanel).toContain("/reportes");
    expect(delPanel).toContain("/intervenciones");
    expect(delHub).toEqual(delPanel);
  });

  it("la tarjeta de modulo usa la superficie del sistema, no blanco", async () => {
    const html = await pintar();
    const tarjetaDePadron =
      [...html.matchAll(/<a\b[^>]*>/g)]
        .map((etiqueta) => etiqueta[0])
        .find((etiqueta) => etiqueta.includes('href="/padron"')) ?? "";

    expect(tarjetaDePadron).toContain("bg-caliza-superficie");
    expect(tarjetaDePadron).not.toContain("bg-white");
  });

  it("dice el rol como lo dice el panel, no como lo guarda la base", async () => {
    const html = await pintar();

    expect(html).toContain("Administrador");
    expect(html).not.toContain("ADMIN_MUNICIPAL");
  });

  it("ofrece cerrar la sesion", async () => {
    expect(await pintar()).toContain("Cerrar sesión");
  });

  it("sin sesion manda a la pantalla de acceso", async () => {
    contextoActualMock.mockResolvedValue(null);

    await expect(pintar()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/acceso");
  });
});
