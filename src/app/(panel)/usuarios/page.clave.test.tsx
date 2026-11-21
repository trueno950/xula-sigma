import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S9 y S11 de `usuarios-ux` en la pantalla del listado.
 *
 * S11 (hallazgo R1): «La contraseña quedó restablecida.» no se anuncia sin
 * la contraseña nueva a la vista. Si la clave ya no se puede mostrar
 * —recargó la página, venció la cookie de 120 segundos, volvió con el botón
 * de atrás— el aviso lo dice y manda a restablecer otra vez, que es la
 * única vía de generar una clave nueva.
 *
 * Va en su archivo y no en `page.test.tsx` porque ese no existe todavía: el
 * sujeto es qué anuncia la página según lo que llega de la URL y de la
 * cabecera del proxy. La cabecera y el listado se mockean; la composición
 * del listado no es lo que se está probando.
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
  avisoPendienteDeLaPeticion: avisoPendienteMock,
  claveMostradaDeLaPeticion: claveMostradaMock,
  listarUsuarios: listarUsuariosMock,
}));
vi.mock("@/modules/usuarios/ui/actions/darDeBajaUsuarioAction", () => ({
  darDeBajaUsuarioAction: vi.fn(),
}));
vi.mock("@/modules/usuarios/ui/actions/restablecerContraseniaAction", () => ({
  restablecerContraseniaAction: vi.fn(),
}));

const { default: PaginaDeUsuarios } = await import("./page");

const USUARIO = "22222222-2222-4222-8222-222222222222";

const MOSTRADA = {
  token: "11111111-1111-4111-8111-111111111111",
  motivo: "restablecimiento" as const,
  usuarioId: USUARIO,
  clave: "clave-temporal-larga",
};

const RESTABLECIDA = "La contraseña quedó restablecida.";
const RESTABLECIDA_SIN_CLAVE =
  "La contraseña quedó restablecida, pero ya no se puede mostrar. Restablézcala para generar otra.";

const html = async (parametros: Record<string, string> = {}): Promise<string> =>
  renderToStaticMarkup(
    await PaginaDeUsuarios({ searchParams: Promise.resolve(parametros) }),
  );

beforeEach(() => {
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "e2e00000-0000-4000-8000-000000000001",
    usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
    origen: "prueba",
  });
  listarUsuariosMock.mockResolvedValue([
    {
      id: USUARIO,
      nombre: "Operadora de Mostrador",
      email: "operadora@motul.example.com",
      rol: "OPERADOR",
      dadoDeBaja: false,
      bajaEn: null,
    },
  ]);
  claveMostradaMock.mockResolvedValue(null);
  avisoPendienteMock.mockResolvedValue(null);
});

describe("la confirmacion del restablecimiento", () => {
  it("con la contraseña nueva a la vista, confirma y la muestra", async () => {
    claveMostradaMock.mockResolvedValue(MOSTRADA);

    const pantalla = await html({
      clave: MOSTRADA.token,
      ok: "restablecimiento",
    });

    expect(pantalla).toContain(RESTABLECIDA);
    expect(pantalla).toContain(MOSTRADA.clave);
    expect(pantalla).not.toContain(RESTABLECIDA_SIN_CLAVE);
  });

  it("sin la contraseña a la vista no anuncia el exito: dice que hay que volver a restablecer", async () => {
    const pantalla = await html({
      clave: MOSTRADA.token,
      ok: "restablecimiento",
    });

    expect(pantalla).toContain(RESTABLECIDA_SIN_CLAVE);
    expect(pantalla).not.toContain(RESTABLECIDA);
  });

  it("la misma confirmacion se anuncia cuando el motivo es el alta", async () => {
    const pantalla = await html({ clave: MOSTRADA.token, ok: "alta" });

    expect(pantalla).toContain(
      "La cuenta quedó creada, pero la contraseña nueva ya no se puede mostrar.",
    );
    expect(pantalla).not.toContain("La cuenta quedó creada.");
  });

  it("la baja no depende de nada en pantalla: la anuncia el aviso de un solo uso", async () => {
    const pantalla = await html({ ok: "baja" });

    expect(pantalla).not.toContain(
      "La persona quedó dada de baja y ya no puede entrar.",
    );
  });
});
