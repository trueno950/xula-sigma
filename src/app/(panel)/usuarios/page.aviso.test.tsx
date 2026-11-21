import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S13 y S14 de `usuarios-ux` en la pantalla del listado: el aviso de la baja
 * nombra a la persona y la fecha, y solo se pinta cuando el proxy traslado su
 * token —el aviso ya consumido no vuelve ni al recargar ni al volver con el
 * boton de atras, porque la cookie ya no existe—.
 *
 * Tambien compone con T2: el alta y el restablecimiento los anuncia la
 * tarjeta de la clave temporal, no un segundo aviso que diga lo mismo.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
const claveMostradaMock = vi.hoisted(() => vi.fn());
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
  destinatarioDeLaClaveDeLaPeticion: vi.fn(async () => null),
}));
vi.mock("@/modules/usuarios/ui/actions/darDeBajaUsuarioAction", () => ({
  darDeBajaUsuarioAction: vi.fn(),
}));
vi.mock("@/modules/usuarios/ui/actions/restablecerContraseniaAction", () => ({
  restablecerContraseniaAction: vi.fn(),
}));

const { default: PaginaDeUsuarios } = await import("./page");

const DADA_DE_BAJA = "33333333-3333-4333-8333-333333333333";
const OPERADOR = "44444444-4444-4444-8444-444444444444";
const TOKEN = "11111111-1111-4111-8111-111111111111";

const html = async (parametros: Record<string, string> = {}): Promise<string> =>
  renderToStaticMarkup(
    await PaginaDeUsuarios({ searchParams: Promise.resolve(parametros) }),
  );

const CON_AZUCAR = "Este aviso se muestra una sola vez";

beforeEach(() => {
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "e2e00000-0000-4000-8000-000000000001",
    usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
    origen: "prueba",
  });
  listarUsuariosMock.mockResolvedValue([
    {
      id: DADA_DE_BAJA,
      nombre: "Jose Armando May",
      email: "jose.may@motul.example.com",
      rol: "OPERADOR",
      dadoDeBaja: true,
      bajaEn: new Date("2026-11-16T20:00:00Z"),
    },
    {
      id: OPERADOR,
      nombre: "Operadora de Mostrador",
      email: "operadora@motul.example.com",
      rol: "OPERADOR",
      dadoDeBaja: false,
      bajaEn: null,
    },
  ]);
  claveMostradaMock.mockResolvedValue(null);
  avisoPendienteMock.mockResolvedValue({
    token: TOKEN,
    usuarioId: DADA_DE_BAJA,
  });
});

describe("el aviso de la baja", () => {
  it("nombra a la persona y la fecha del listado bajo RLS", async () => {
    const pantalla = await html({ aviso: TOKEN, ok: "baja" });

    expect(pantalla).toContain(
      "Se dio de baja a Jose Armando May el 16 nov 2026.",
    );
    expect(pantalla).toContain(CON_AZUCAR);
  });

  /**
   * S14: la cookie la consume el proxy en la unica peticion que trae su
   * token. Un `?ok=baja` sin aviso que consumir no anuncia una accion que no
   * ocurrio en esta visita.
   */
  it("sin el aviso del proxy no se anuncia nada", async () => {
    avisoPendienteMock.mockResolvedValue(null);

    expect(await html({ ok: "baja" })).not.toContain(CON_AZUCAR);
    expect(await html({ ok: "baja" })).not.toContain("Se dio de baja a");
  });

  it("el aviso es de la baja: un ok de otra accion no lo pinta", async () => {
    expect(await html({ aviso: TOKEN, ok: "alta" })).not.toContain(CON_AZUCAR);
  });

  it("si la cuenta ya no se puede leer bajo RLS no se inventa un nombre", async () => {
    avisoPendienteMock.mockResolvedValue({
      token: TOKEN,
      usuarioId: "55555555-5555-4555-8555-555555555555",
    });

    expect(await html({ aviso: TOKEN, ok: "baja" })).not.toContain(CON_AZUCAR);
  });

  /**
   * Composicion con T2: el alta y el restablecimiento se anuncian con la
   * tarjeta de la clave temporal. Dos avisos para la misma accion serian dos
   * textos que se pueden contradecir.
   */
  it("el restablecimiento se anuncia con la tarjeta y no con el aviso de baja", async () => {
    claveMostradaMock.mockResolvedValue({
      token: TOKEN,
      motivo: "restablecimiento",
      usuarioId: OPERADOR,
      clave: "clave-temporal-larga",
    });

    const pantalla = await html({ clave: TOKEN, ok: "restablecimiento" });

    expect(pantalla).toContain("clave-temporal-larga");
    expect(pantalla).toContain("La contraseña quedó restablecida.");
    expect(pantalla).not.toContain(CON_AZUCAR);
  });
});
