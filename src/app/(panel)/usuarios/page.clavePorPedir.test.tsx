import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S4 de `usuarios-seguridad`: con JavaScript la contrasenia temporal no
 * queda en un payload que el router pueda restaurar sin pedirsela al
 * servidor. El router de Next guarda el payload de la ruta y lo reutiliza al
 * volver con «Atras» (`node_modules/next/dist/docs/01-app/04-glossary.md:47`,
 * Next 16.3.1), asi que lo que se afirma aca es sobre **lo que la pantalla
 * pinta**: con la clave todavia en la cookie, el render que ve el router
 * lleva el token y ni un caracter de la contrasenia; la isla se la pide al
 * Route Handler, que la entrega y borra la cookie en el mismo viaje.
 *
 * Va en su archivo, aparte de `page.clave.test.tsx` —el camino sin
 * JavaScript— y de `page.claveSinMostrar.test.tsx` —la recarga—, porque son
 * tres desenlaces distintos de la misma cookie.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
const claveMostradaMock = vi.hoisted(() => vi.fn());
const clavePorPedirMock = vi.hoisted(() => vi.fn());
const destinatarioMock = vi.hoisted(() => vi.fn());
const avisoPendienteMock = vi.hoisted(() => vi.fn());
const listarUsuariosMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("@/shared/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/auth")>()),
  contextoActual: contextoActualMock,
}));
vi.mock("@/modules/usuarios", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/usuarios")>()),
  listarUsuarios: listarUsuariosMock,
}));
vi.mock("@/modules/usuarios/ui/avisoPendienteEnCookie", () => ({
  avisoPendienteDeLaPeticion: avisoPendienteMock,
}));
vi.mock("@/modules/usuarios/ui/claveTemporalEnCookie", () => ({
  claveMostradaDeLaPeticion: claveMostradaMock,
  clavePorPedirDeLaPeticion: clavePorPedirMock,
}));
vi.mock("@/modules/usuarios/ui/destinatarioDeLaClave", () => ({
  destinatarioDeLaClaveDeLaPeticion: destinatarioMock,
}));
vi.mock("@/modules/usuarios/ui/actions/darDeBajaUsuarioAction", () => ({
  darDeBajaUsuarioAction: vi.fn(),
}));
vi.mock("@/modules/usuarios/ui/actions/restablecerContraseniaAction", () => ({
  restablecerContraseniaAction: vi.fn(),
}));
vi.mock("@/modules/usuarios/ui/actions/reactivarUsuarioAction", () => ({
  reactivarUsuarioAction: vi.fn(),
}));

const { default: PaginaDeUsuarios } = await import("./page");

const TOKEN = "11111111-1111-4111-8111-111111111111";
const USUARIO = "22222222-2222-4222-8222-222222222222";
const CLAVE = "clave-temporal-larga";

const OPERADOR = {
  id: USUARIO,
  nombre: "Operadora de Mostrador",
  email: "operadora@motul.example.com",
  rol: "OPERADOR",
  dadoDeBaja: false,
  bajaEn: null,
};

const html = async (parametros: Record<string, string> = {}): Promise<string> =>
  renderToStaticMarkup(
    await PaginaDeUsuarios({ searchParams: Promise.resolve(parametros) }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "e2e00000-0000-4000-8000-000000000001",
    usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
    origen: "prueba",
  });
  listarUsuariosMock.mockResolvedValue([OPERADOR]);
  claveMostradaMock.mockResolvedValue(null);
  clavePorPedirMock.mockResolvedValue(null);
  destinatarioMock.mockResolvedValue(null);
  avisoPendienteMock.mockResolvedValue(null);
});

describe("la clave que el router todavia puede pedir", () => {
  it("el render del router no trae la contrasenia y anuncia el exito igual", async () => {
    clavePorPedirMock.mockResolvedValue(USUARIO);

    const pantalla = await html({ clave: TOKEN, ok: "restablecimiento" });

    expect(pantalla).not.toContain(CLAVE);
    // El payload lleva el token y el nombre; la tarjeta la arma la isla.
    expect(pantalla).not.toContain('id="clave-entregada"');
    expect(pantalla).toContain("La contraseña quedó restablecida.");
    expect(pantalla).not.toContain("ya no se puede mostrar");
  });

  it("la cuenta que no está en el listado no recibe la clave", async () => {
    clavePorPedirMock.mockResolvedValue("55555555-5555-4555-8555-555555555555");

    const pantalla = await html({ clave: TOKEN, ok: "restablecimiento" });

    expect(pantalla).not.toContain(CLAVE);
    expect(pantalla).not.toContain("Contraseña temporal de");
  });

  it("sin la cookie de la clave sigue diciendo que ya no se puede mostrar", async () => {
    destinatarioMock.mockResolvedValue({ token: TOKEN, usuarioId: USUARIO });

    const pantalla = await html({ clave: TOKEN, ok: "restablecimiento" });

    expect(pantalla).not.toContain(CLAVE);
    expect(pantalla).toContain(
      "La contraseña temporal de Operadora de Mostrador ya no se puede mostrar.",
    );
  });

  it("con la cabecera del proxy la clave se sigue pintando: es el camino sin JavaScript", async () => {
    claveMostradaMock.mockResolvedValue({
      token: TOKEN,
      motivo: "restablecimiento",
      usuarioId: USUARIO,
      clave: CLAVE,
    });

    const pantalla = await html({ clave: TOKEN, ok: "restablecimiento" });

    expect(pantalla).toContain(CLAVE);
    expect(pantalla).toContain('id="clave-entregada"');
  });
});
