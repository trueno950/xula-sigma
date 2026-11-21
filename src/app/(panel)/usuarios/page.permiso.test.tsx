import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S15 de `usuarios-ux` (hallazgo P1) en el listado: quien no administra
 * cuentas ve su pantalla dentro del panel —encabezado y descripcion, como
 * cualquier otra pantalla del modulo— y no una caja suelta sin salida.
 *
 * La migaja no esta en una raiz de seccion (`raicesSinMigaja.test.ts`); lo
 * que se conserva aca es el encabezado, y en `/usuarios/alta` tambien la
 * migaja (`alta/page.test.tsx`). El cuerpo del aviso es uno solo para las
 * dos rutas: `SinPermisoDeUsuarios`.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
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

const DESCRIPCION =
  "Quién entra a este panel y con qué rol. Las cuentas son de este ayuntamiento.";

const html = async (parametros: Record<string, string> = {}): Promise<string> =>
  renderToStaticMarkup(
    await PaginaDeUsuarios({ searchParams: Promise.resolve(parametros) }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "e2e00000-0000-4000-8000-000000000001",
    usuario: { id: "usuario-1", rol: "OPERADOR" },
    origen: "prueba",
  });
  listarUsuariosMock.mockResolvedValue([]);
});

describe("el listado sin permiso (S15)", () => {
  it("conserva el encabezado de la pantalla y dice cual es el rol", async () => {
    const pantalla = await html();

    expect(pantalla).toContain("<h1");
    expect(pantalla).toContain("Usuarios");
    expect(pantalla).toContain(DESCRIPCION);
    expect(pantalla).toContain("Su rol es Operador: no administra cuentas.");
  });

  it("dice a quien pedirle acceso y deja una salida", async () => {
    const pantalla = await html();

    expect(pantalla).toContain("Pida al administrador municipal");
    expect(pantalla).toContain("Volver al padrón");
    expect(pantalla).toContain('href="/padron"');
  });

  it("no ofrece lo que el rol no puede hacer, ni lee el listado", async () => {
    const pantalla = await html();

    expect(pantalla).not.toContain("Nuevo usuario");
    expect(listarUsuariosMock).not.toHaveBeenCalled();
  });

  it("sin sesion no dibuja el listado", async () => {
    contextoActualMock.mockResolvedValue(null);

    expect(await html()).not.toContain("Nuevo usuario");
    expect(listarUsuariosMock).not.toHaveBeenCalled();
  });
});
