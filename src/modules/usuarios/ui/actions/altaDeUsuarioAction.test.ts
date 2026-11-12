import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { CorreoYaRegistradoError, RolNoAsignableError } from "../../domain";
import { decodificarClaveMostrada } from "../claveMostrada";

/**
 * El borde de la accion del alta (S3 y S4): valida la forma, redacta el error
 * y **no pone la contrasenia temporal en la URL**. El caso de uso ya lo cubre
 * `altaDeUsuario.integration.test.ts`, asi que se mockea.
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

const errorDelDestino = () => {
  const url = destino();
  return new URLSearchParams(url.slice(url.indexOf("?") + 1)).get("error");
};

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

describe("altaDeUsuarioAction", () => {
  it("sin sesion manda al acceso y no da de alta a nadie", async () => {
    contextoActualMock.mockResolvedValue(null);

    await expect(altaDeUsuarioAction(formulario(ALTA_VALIDA))).rejects.toThrow(
      "REDIRECT:/acceso",
    );
    expect(altaDeUsuarioMock).not.toHaveBeenCalled();
  });

  it("sin correo vuelve al formulario con un codigo, no con un 500", async () => {
    await expect(
      altaDeUsuarioAction(
        formulario({ ...ALTA_VALIDA, email: "no-es-correo" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("formulario");
    expect(altaDeUsuarioMock).not.toHaveBeenCalled();
  });

  it("sin rol elegido lo dice con su propio codigo", async () => {
    await expect(
      altaDeUsuarioAction(formulario({ ...ALTA_VALIDA, rol: "" })),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("sin-rol");
    expect(altaDeUsuarioMock).not.toHaveBeenCalled();
  });

  it("un correo ya registrado se lee como instruccion para la operadora", async () => {
    const error = new CorreoYaRegistradoError();
    altaDeUsuarioMock.mockRejectedValue(error);

    await expect(altaDeUsuarioAction(formulario(ALTA_VALIDA))).rejects.toThrow(
      "REDIRECT:",
    );

    expect(errorDelDestino()).toBe("correo-ya-registrado");
  });

  it("un rol fuera de los asignables no se muestra como error interno", async () => {
    const error = new RolNoAsignableError();
    altaDeUsuarioMock.mockRejectedValue(error);

    await expect(
      altaDeUsuarioAction(
        formulario({ ...ALTA_VALIDA, rol: "ADMIN_MUNICIPAL" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(errorDelDestino()).toBe("rol-no-asignable");
  });

  it("sin permiso lleva el codigo que la pantalla traduce", async () => {
    altaDeUsuarioMock.mockRejectedValue(new NoAutorizadoError());

    await expect(altaDeUsuarioAction(formulario(ALTA_VALIDA))).rejects.toThrow(
      "REDIRECT:",
    );

    expect(errorDelDestino()).toBe("sin-permiso");
  });

  it("una falla desconocida cae en el generico y deja su traza", async () => {
    altaDeUsuarioMock.mockRejectedValue(new Error("se cayo la base"));

    await expect(altaDeUsuarioAction(formulario(ALTA_VALIDA))).rejects.toThrow(
      "REDIRECT:",
    );

    expect(errorDelDestino()).toBe("generico-alta");
    expect(console.error).toHaveBeenCalled();
  });

  it("el exito deja la clave en una cookie httpOnly y no en la URL", async () => {
    altaDeUsuarioMock.mockResolvedValue({
      usuarioId: USUARIO_NUEVO,
      claveTemporal: CLAVE_TEMPORAL,
    });

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
});
