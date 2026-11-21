import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S16 (P2) en la pagina: la pantalla sin permiso conserva el encabezado y la
 * descripcion del panel —lo que la auditoria hallo ausente en `/exportacion`—
 * y no dibuja ningun formulario que la accion fuera a rechazar igual.
 *
 * La migaja no va: `/marca` es una raiz de seccion (`raicesSinMigaja.test.ts`).
 */

const contextoActualMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/shared/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/auth")>()),
  contextoActual: contextoActualMock,
}));
vi.mock("@/shared/tenancy/contexto", () => ({
  exigirAyuntamiento: async () => ({ nombre: "Motul", marca: {} }),
}));

const { default: PaginaDeMarca } = await import("./page");

const html = async (parametros: Record<string, string> = {}): Promise<string> =>
  renderToStaticMarkup(
    await PaginaDeMarca({ searchParams: Promise.resolve(parametros) }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue({
    ayuntamientoId: "motul",
    usuario: { id: "usuario-1", rol: "OPERADOR" },
    origen: "prueba",
  });
});

describe("la pagina de marca sin permiso (S16)", () => {
  it("conserva el encabezado y dice cual es el rol y a quien pedirlo", async () => {
    const pantalla = await html();

    expect(pantalla).toContain("<h1");
    expect(pantalla).toContain("Marca del ayuntamiento");
    expect(pantalla).toContain("Su rol es Operador");
    expect(pantalla).toContain("Pida al administrador municipal");
  });

  it("no ofrece lo que el rol no puede hacer", async () => {
    const pantalla = await html();

    expect(pantalla).not.toContain("Guardar colores");
    expect(pantalla).not.toContain("Quitar escudo");
    expect(pantalla).not.toContain('type="file"');
  });

  it("sin sesion tampoco dibuja los formularios", async () => {
    contextoActualMock.mockResolvedValue(null);

    expect(await html()).not.toContain("Guardar colores");
  });
});
