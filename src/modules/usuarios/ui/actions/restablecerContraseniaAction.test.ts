import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { decodificarClaveMostrada } from "../claveMostrada";

/**
 * S5 y S4 en el borde de la accion: se restablece con la clave que la
 * pantalla muestra, y **la clave no viaja en la URL**. S7 entra por el
 * camino de error: un `usuarioId` de otro municipio tiene que llegar a la
 * operadora como «El recurso no existe.», nunca como un 403.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
const restablecerMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() =>
  vi.fn((destino: string): never => {
    throw new Error(`REDIRECT:${destino}`);
  }),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());

const cookies = vi.hoisted(() => {
  const guardadas = new Map<
    string,
    { valor: string; opciones: Record<string, unknown> }
  >();

  return {
    guardadas,
    almacen: {
      set: (nombre: string, valor: string, opciones: Record<string, unknown>) =>
        guardadas.set(nombre, { valor, opciones }),
      get: (nombre: string) => {
        const guardada = guardadas.get(nombre);
        return guardada ? { value: guardada.valor } : undefined;
      },
      has: (nombre: string) => guardadas.has(nombre),
      delete: (nombre: string) => guardadas.delete(nombre),
    },
  };
});

vi.mock("@/shared/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/auth")>()),
  contextoActual: contextoActualMock,
  restablecerContrasenia: restablecerMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/headers", () => ({ cookies: async () => cookies.almacen }));

const { restablecerContraseniaAction } = await import(
  "./restablecerContraseniaAction"
);

const CONTEXTO: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const OPERADOR = "33333333-3333-4333-8333-333333333333";

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

const claveMostrada = () =>
  decodificarClaveMostrada(
    cookies.guardadas.get("clave-temporal-de-usuario")?.valor,
  );

beforeEach(() => {
  vi.clearAllMocks();
  cookies.guardadas.clear();
  contextoActualMock.mockResolvedValue(CONTEXTO);
  restablecerMock.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("restablecerContraseniaAction", () => {
  it("sin sesion manda al acceso y no toca la credencial", async () => {
    contextoActualMock.mockResolvedValue(null);

    await expect(
      restablecerContraseniaAction(formulario({ usuarioId: OPERADOR })),
    ).rejects.toThrow("REDIRECT:/acceso");
    expect(restablecerMock).not.toHaveBeenCalled();
  });

  it("sin persona nombrada vuelve al listado con su mensaje", async () => {
    await expect(
      restablecerContraseniaAction(formulario({ usuarioId: "no-es-uuid" })),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("sin-destinatario");
    expect(restablecerMock).not.toHaveBeenCalled();
  });

  it("un usuario de otro municipio se lee como que no existe", async () => {
    restablecerMock.mockRejectedValue(new NoEncontradoError());

    await expect(
      restablecerContraseniaAction(formulario({ usuarioId: OPERADOR })),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("no-encontrado");
    expect(destino()).toBe("/usuarios?error=no-encontrado");
    expect(cookies.guardadas.size).toBe(0);
  });

  it("sin permiso lleva el codigo que la pantalla traduce", async () => {
    restablecerMock.mockRejectedValue(new NoAutorizadoError());

    await expect(
      restablecerContraseniaAction(formulario({ usuarioId: OPERADOR })),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("sin-permiso");
  });

  it("la clave que se muestra es la que quedo guardada, y no esta en la URL", async () => {
    await expect(
      restablecerContraseniaAction(formulario({ usuarioId: OPERADOR })),
    ).rejects.toThrow("REDIRECT:");

    const mostrada = claveMostrada();
    const [, { nuevaClave }] = restablecerMock.mock.calls.at(-1) ?? [];

    expect(nuevaClave).toEqual(expect.any(String));
    expect(mostrada).toMatchObject({
      motivo: "restablecimiento",
      usuarioId: OPERADOR,
      clave: nuevaClave,
    });
    expect(destino()).toBe(
      `/usuarios?clave=${mostrada?.token}&ok=restablecimiento`,
    );
    expect(destino()).not.toContain(nuevaClave);
    expect(
      cookies.guardadas.get("clave-temporal-de-usuario")?.opciones,
    ).toMatchObject({ httpOnly: true, path: "/usuarios", maxAge: 120 });
    expect(revalidatePathMock).toHaveBeenCalledWith("/usuarios");
  });
});
