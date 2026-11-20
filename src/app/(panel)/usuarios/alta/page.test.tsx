import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoActualMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/auth")>()),
  contextoActual: contextoActualMock,
}));
vi.mock("@/modules/usuarios/ui/actions/altaDeUsuarioAction", () => ({
  altaDeUsuarioAction: "alta-action",
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

const { default: PaginaDeAltaDeUsuario } = await import("./page");

const contexto = (rol: "ADMIN_MUNICIPAL" | "OPERADOR") => ({
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol },
  origen: "web",
});

const pagina = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await PaginaDeAltaDeUsuario({
      searchParams: Promise.resolve(searchParams),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue(contexto("ADMIN_MUNICIPAL"));
});

describe("alta de usuario: validaciones en espanol (S7)", () => {
  it("el minimo del nombre se explica antes de escribir", async () => {
    const html = await pagina();

    expect(html).toContain("Al menos 3 letras");
  });

  /**
   * El navegador valida `required`, `minLength` y `type="email"` con su
   * propio mensaje, en el idioma del navegador y no en el de la operadora:
   * con esos atributos el rechazo nunca llega al servidor, y su mensaje en
   * espanol no se ve. Los obligatorios se dicen en una linea.
   */
  it("ningun campo dispara el aviso del navegador", async () => {
    const html = await pagina();

    expect(html).not.toContain("required");
    expect(html.toLowerCase()).not.toContain("minlength");
    expect(html).not.toContain('type="email"');
    // React pinta las dos tal cual, con mayuscula: no son atributos HTML
    // conocidos por el, y son los que dan el teclado de correo sin validar.
    expect(html).toContain('inputMode="email"');
    expect(html).toContain('autoComplete="email"');
    expect(html).toContain("Todos los campos son obligatorios.");
  });

  it.each([
    ["correo-invalido", "Escriba un correo válido"],
    ["nombre-corto", "El nombre debe tener al menos 3 letras."],
    ["sin-rol", "Elija un rol."],
  ])("el rechazo %s se lee en espanol", async (codigo, mensaje) => {
    const html = await pagina({ error: codigo });

    expect(html).toContain(mensaje);
  });

  it("un codigo de error que no existe no pinta nada", async () => {
    const html = await pagina({ error: "<script>alert(1)</script>" });

    expect(html).not.toContain("<script>alert(1)</script>");
  });
});

/**
 * S8 de `usuarios-ux`: la migaja dice el camino y el encabezado dice donde se
 * esta; el mismo titulo dos veces es ruido, no orientacion.
 */
describe("alta de usuario: el titulo no se repite (S8)", () => {
  it("la migaja lleva al listado y el encabezado nombra la pantalla una sola vez", async () => {
    const html = await pagina();

    expect(html.match(/Nuevo usuario/g) ?? []).toHaveLength(1);
    expect(html).toContain('href="/usuarios"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(">Alta<");
  });
});

describe("alta de usuario: permiso y sesion", () => {
  it("un rol que no administra usuarios no llega al formulario", async () => {
    contextoActualMock.mockResolvedValue(contexto("OPERADOR"));

    const html = await pagina();

    expect(html).toContain(
      "Su rol no tiene permiso para administrar usuarios.",
    );
    expect(html).not.toContain('name="nombre"');
  });

  it("sin sesion no dibuja el formulario", async () => {
    contextoActualMock.mockResolvedValue(null);

    const html = await pagina();

    expect(html).toContain(
      "Su rol no tiene permiso para administrar usuarios.",
    );
    expect(html).not.toContain('name="nombre"');
  });
});
