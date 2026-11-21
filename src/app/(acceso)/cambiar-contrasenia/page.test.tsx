import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((_destino: string): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const contextoActualMock = vi.hoisted(() => vi.fn());
const contextoDeCambioMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/shared/auth", () => ({
  contextoActual: contextoActualMock,
  contextoDeCambioDeClave: contextoDeCambioMock,
}));

const { default: PaginaDeCambioDeClave } = await import("./page");

const pintar = async (consulta: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await PaginaDeCambioDeClave({ searchParams: Promise.resolve(consulta) }),
  );

const destino = () => String(redirectMock.mock.calls.at(-1)?.[0] ?? "");

describe("pantalla de cambio obligatorio de contrasenia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contextoActualMock.mockResolvedValue(null);
    contextoDeCambioMock.mockResolvedValue({
      ayuntamientoId: "motul",
      usuarioId: "usuario-1",
      sesionId: "sesion-1",
      origen: "https://motul.xulasigma.mx",
    });
  });

  it("sin sesion manda al acceso", async () => {
    contextoDeCambioMock.mockResolvedValue(null);

    await expect(pintar()).rejects.toThrow("NEXT_REDIRECT");
    expect(destino()).toBe("/acceso");
  });

  it("quien ya tiene clave propia no ve esta pantalla", async () => {
    contextoDeCambioMock.mockResolvedValue(null);
    contextoActualMock.mockResolvedValue({
      usuario: { id: "u1", rol: "OPERADOR" },
    });

    await expect(pintar()).rejects.toThrow("NEXT_REDIRECT");
    expect(destino()).toBe("/");
  });

  it("pide la clave nueva dos veces y no deja que el navegador la imponga", async () => {
    const html = await pintar();

    expect(html.match(/type="password"/g)).toHaveLength(2);
    expect(html.match(/autocomplete="new-password"/gi)).toHaveLength(2);
    expect(html).not.toContain("required");
    expect(html).toContain("Cambiar contraseña");
  });

  it("el desplegable de ceros no lleva la clave, solo el codigo del error", async () => {
    const html = await pintar({ error: "corta" });

    expect(html).toContain("al menos 12 caracteres");
    expect(html).not.toMatch(/name="nueva"[^>]*value=/);
  });

  it("un codigo que no esta en la lista no pinta texto ajeno", async () => {
    const html = await pintar({ error: "lo-que-sea" });

    expect(html).not.toContain("lo-que-sea");
  });
});
