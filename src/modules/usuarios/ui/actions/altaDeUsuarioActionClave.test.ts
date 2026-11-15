import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { decodificarClaveMostrada } from "../claveMostrada";

/**
 * El transporte de la contrasenia temporal (S4 y S2): la clave no viaja en
 * la URL, viaja en una cookie httpOnly cuyo token es lo unico que el
 * redirect lleva.
 *
 * Vive aparte de `altaDeUsuarioAction.test.ts` —que cubre validacion y
 * redaccion del error— por tema y para que ninguno de los dos pase las 200
 * lineas de `AGENTS.md`.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
const altaDeUsuarioMock = vi.hoisted(() => vi.fn());
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
}));
vi.mock("../../composicion", () => ({ altaDeUsuario: altaDeUsuarioMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/headers", () => ({ cookies: async () => cookies.almacen }));

const { altaDeUsuarioAction } = await import("./altaDeUsuarioAction");

const CONTEXTO: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const USUARIO_NUEVO = "22222222-2222-4222-8222-222222222222";
const CLAVE_TEMPORAL = "Kj7mPq2xRt9wNb4Y";

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }
  return formData;
};

const ALTA_VALIDA = {
  nombre: "Nueva Operadora",
  email: "nueva@motul.example.com",
  rol: "OPERADOR",
};

const destino = () => String(redirectMock.mock.calls.at(-1)?.[0] ?? "");

beforeEach(() => {
  vi.clearAllMocks();
  cookies.guardadas.clear();
  contextoActualMock.mockResolvedValue(CONTEXTO);
  altaDeUsuarioMock.mockResolvedValue({
    usuarioId: USUARIO_NUEVO,
    claveTemporal: CLAVE_TEMPORAL,
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("altaDeUsuarioAction — la clave temporal", () => {
  it("el exito deja la clave en una cookie httpOnly y no en la URL", async () => {
    await expect(altaDeUsuarioAction(formulario(ALTA_VALIDA))).rejects.toThrow(
      "REDIRECT:",
    );

    const guardada = cookies.guardadas.get("clave-temporal-de-usuario");
    const mostrada = decodificarClaveMostrada(guardada?.valor);

    expect(mostrada).toEqual({
      token: expect.stringMatching(/^[0-9a-f-]{36}$/),
      motivo: "alta",
      usuarioId: USUARIO_NUEVO,
      clave: CLAVE_TEMPORAL,
    });
    expect(guardada?.opciones).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/usuarios",
      maxAge: 120,
    });
    expect(destino()).toBe(`/usuarios?clave=${mostrada?.token}&ok=alta`);
    expect(destino()).not.toContain(CLAVE_TEMPORAL);
    expect(revalidatePathMock).toHaveBeenCalledWith("/usuarios");
  });

  /**
   * La cuenta ya quedo creada: lo unico que puede fallar despues es guardar
   * la clave para mostrarla, y sin ella la operadora no tiene con que
   * entrar. Se dice con su codigo en vez de terminar en un 500.
   */
  it("si la clave no se puede guardar, la cuenta queda lista y lo dice", async () => {
    const escribir = vi.spyOn(cookies.almacen, "set").mockImplementation(() => {
      throw new Error("no hay donde escribir la cookie");
    });

    try {
      await expect(
        altaDeUsuarioAction(formulario(ALTA_VALIDA)),
      ).rejects.toThrow("REDIRECT:");

      expect(destino()).toBe("/usuarios/alta?error=clave-no-mostrada");
      expect(altaDeUsuarioMock).toHaveBeenCalledTimes(1);
      // El listado se revalida igual: la cuenta existe.
      expect(revalidatePathMock).toHaveBeenCalledWith("/usuarios");
    } finally {
      escribir.mockRestore();
    }
  });
});
