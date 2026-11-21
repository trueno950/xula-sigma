import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S11 de `usuarios-ux` (hallazgo R1) cuando la clave ya no se puede mostrar:
 * la tarjeta dice de quién era y ofrece restablecer su contraseña otra vez,
 * en vez de anunciar un éxito vacío
 * (`design/usuarios-clave-temporal/01-aviso-sobre-la-lista.html`, muestra).
 *
 * La persona sale de la cookie del destinatario —lo único que sobrevive a la
 * recarga cuando el proxy ya consumió la de la clave— y se busca en el
 * listado que esta misma petición leyó bajo RLS. Va en su archivo, aparte de
 * `page.clave.test.tsx`, porque son dos cookies distintas y dos desenlaces
 * distintos del mismo hallazgo.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
const claveMostradaMock = vi.hoisted(() => vi.fn());
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
/** Quien administra: la sesion del `beforeEach`. */
const ACTOR = "usuario-1";

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

const SIN_CLAVE =
  "La contraseña quedó restablecida, pero ya no se puede mostrar. Restablézcala para generar otra.";

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "e2e00000-0000-4000-8000-000000000001",
    usuario: { id: ACTOR, rol: "ADMIN_MUNICIPAL" },
    origen: "prueba",
  });
  listarUsuariosMock.mockResolvedValue([OPERADOR]);
  claveMostradaMock.mockResolvedValue(null);
  destinatarioMock.mockResolvedValue(null);
  avisoPendienteMock.mockResolvedValue(null);
});

describe("la clave que ya no se puede mostrar", () => {
  it("nombra a la persona y ofrece restablecer su contraseña", async () => {
    destinatarioMock.mockResolvedValue({ token: TOKEN, usuarioId: USUARIO });

    const pantalla = await html({ clave: TOKEN, ok: "restablecimiento" });

    expect(pantalla).toContain(
      "La contraseña temporal de Operadora de Mostrador ya no se puede mostrar.",
    );
    expect(pantalla).toContain(
      "Restablecer la contraseña de Operadora de Mostrador",
    );
    // Un solo texto para el mismo hecho: el generico no se suma al nombrado.
    expect(pantalla).not.toContain(SIN_CLAVE);
  });

  /**
   * T3 y S1: nadie restablece su propia contraseña. La cookie puede traer la
   * cuenta de quien pregunta —el servidor la rechaza— y el aviso no ofrece un
   * botón que la acción va a rechazar.
   */
  it("no ofrece restablecer la contraseña de la propia cuenta", async () => {
    listarUsuariosMock.mockResolvedValue([
      {
        id: ACTOR,
        nombre: "Ana Canché",
        email: "admin@motul.example.com",
        rol: "ADMIN_MUNICIPAL",
        dadoDeBaja: false,
        bajaEn: null,
      },
    ]);
    destinatarioMock.mockResolvedValue({ token: TOKEN, usuarioId: ACTOR });

    const pantalla = await html({ clave: TOKEN, ok: "restablecimiento" });

    expect(pantalla).toContain("La contraseña temporal de Ana Canché");
    expect(pantalla).not.toContain("Restablecer la contraseña de Ana Canché");
  });

  it("una cuenta que no está en el listado no se inventa", async () => {
    destinatarioMock.mockResolvedValue({
      token: TOKEN,
      usuarioId: "55555555-5555-4555-8555-555555555555",
    });

    const pantalla = await html({ clave: TOKEN, ok: "restablecimiento" });

    expect(pantalla).not.toContain("La contraseña temporal de");
    expect(pantalla).toContain(SIN_CLAVE);
  });
});
