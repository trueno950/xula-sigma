import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoActualMock = vi.hoisted(() => vi.fn());
const cookieJar = vi.hoisted(() => ({
  valor: undefined as string | undefined,
}));

vi.mock("@/shared/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/auth")>()),
  contextoActual: contextoActualMock,
}));
vi.mock("@/modules/usuarios/ui/actions/altaDeUsuarioAction", () => ({
  altaDeUsuarioAction: "alta-action",
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) =>
      nombre === "borrador-de-usuario" && cookieJar.valor !== undefined
        ? { name: nombre, value: cookieJar.valor }
        : undefined,
  }),
}));

const { default: PaginaDeAltaDeUsuario } = await import("./page");

const TOKEN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const NOMBRE = "Operadora de Turno";
const CORREO = "operadora@motul.example.com";

const contexto = () => ({
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
});

const BORRADOR = {
  token: TOKEN,
  campos: { nombre: NOMBRE, email: CORREO, rol: "OPERADOR" },
};

const pagina = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await PaginaDeAltaDeUsuario({
      searchParams: Promise.resolve(searchParams),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  cookieJar.valor = undefined;
  contextoActualMock.mockResolvedValue(contexto());
});

/**
 * S6 de `usuarios-ux`: el rechazo del servidor deja lo capturado en una
 * cookie httpOnly y la URL lleva solo el token opaco; la pagina lo vuelve a
 * mostrar en vez de devolver el formulario vacio.
 */
describe("alta de usuario: el borrador del rechazo", () => {
  it("con el token de la URL, el formulario vuelve con lo capturado", async () => {
    cookieJar.valor = JSON.stringify(BORRADOR);

    const html = await pagina({ borrador: TOKEN });

    expect(html).toContain(`value="${NOMBRE}"`);
    expect(html).toContain(`value="${CORREO}"`);
    expect(html).toContain('value="OPERADOR" selected=""');
    expect(html).not.toContain('<option value="" disabled="" selected');
  });

  it("un token que no es el de la cookie no rellena nada", async () => {
    cookieJar.valor = JSON.stringify(BORRADOR);

    const html = await pagina({
      borrador: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    expect(html).not.toContain(NOMBRE);
    expect(html).not.toContain(CORREO);
    expect(html).toContain('<option value="" disabled="" selected');
  });

  it("sin token en la URL no se lee la cookie", async () => {
    cookieJar.valor = JSON.stringify(BORRADOR);

    const html = await pagina();

    expect(html).not.toContain(NOMBRE);
    expect(html).not.toContain(CORREO);
  });

  it("el mensaje en espanol de la accion sigue saliendo arriba del formulario", async () => {
    cookieJar.valor = JSON.stringify(BORRADOR);

    const html = await pagina({ borrador: TOKEN, error: "correo-invalido" });

    expect(html).toContain("Escriba un correo válido");
    expect(html).toContain(`value="${CORREO}"`);
  });
});
