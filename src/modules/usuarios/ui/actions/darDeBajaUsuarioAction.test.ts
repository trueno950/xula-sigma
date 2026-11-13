import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";

/**
 * S6 y S7 en el borde de la accion: la baja es logica y se confirma en el
 * listado; un `usuarioId` de otro municipio llega como «El recurso no
 * existe.» —nunca como 403— porque el caso de uso resuelve el objetivo bajo
 * RLS antes de mirar el rol.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
const darDeBajaMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((destino: string): never => {
    throw new Error(`REDIRECT:${destino}`);
  }),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const cookiesMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/auth")>()),
  contextoActual: contextoActualMock,
  darDeBajaUsuario: darDeBajaMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookiesMock }),
}));

const { darDeBajaUsuarioAction } = await import("./darDeBajaUsuarioAction");

const CONTEXTO: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const OPERADOR = "44444444-4444-4444-8444-444444444444";

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }
  return formData;
};

const destino = () => String(redirectMock.mock.calls.at(-1)?.[0] ?? "");

const errorDelDestino = () => {
  const url = destino();
  return new URLSearchParams(url.slice(url.indexOf("?") + 1)).get("error");
};

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue(CONTEXTO);
  darDeBajaMock.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("darDeBajaUsuarioAction", () => {
  it("sin sesion manda al acceso y no da de baja a nadie", async () => {
    contextoActualMock.mockResolvedValue(null);

    await expect(
      darDeBajaUsuarioAction(formulario({ usuarioId: OPERADOR })),
    ).rejects.toThrow("REDIRECT:/acceso");
    expect(darDeBajaMock).not.toHaveBeenCalled();
  });

  it("sin persona nombrada vuelve al listado con su mensaje", async () => {
    await expect(
      darDeBajaUsuarioAction(formulario({ usuarioId: "motul" })),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("sin-destinatario");
    expect(darDeBajaMock).not.toHaveBeenCalled();
  });

  it("un usuario de otro municipio se lee como que no existe", async () => {
    darDeBajaMock.mockRejectedValue(new NoEncontradoError());

    await expect(
      darDeBajaUsuarioAction(formulario({ usuarioId: OPERADOR })),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("no-encontrado");
    expect(destino()).not.toContain("ok=");
  });

  it("sin permiso lleva el codigo que la pantalla traduce", async () => {
    darDeBajaMock.mockRejectedValue(new NoAutorizadoError());

    await expect(
      darDeBajaUsuarioAction(formulario({ usuarioId: OPERADOR })),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("sin-permiso");
  });

  it("la baja exitosa vuelve al listado confirmando, sin clave que mostrar", async () => {
    await expect(
      darDeBajaUsuarioAction(formulario({ usuarioId: OPERADOR })),
    ).rejects.toThrow("REDIRECT:");

    expect(destino()).toBe("/usuarios?ok=baja");
    expect(darDeBajaMock).toHaveBeenCalledWith(CONTEXTO, {
      usuarioId: OPERADOR,
    });
    expect(cookiesMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/usuarios");
  });

  it("una falla desconocida cae en el generico", async () => {
    darDeBajaMock.mockRejectedValue(new Error("se cayo la base"));

    await expect(
      darDeBajaUsuarioAction(formulario({ usuarioId: OPERADOR })),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("generico-baja");
  });
});
