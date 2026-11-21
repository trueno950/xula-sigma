import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { decodificarBorrador } from "../borradorDeAltaDeUsuario";

/**
 * S6 de `usuarios-ux`: el rechazo del alta vuelve con lo capturado en una
 * cookie httpOnly de vida corta, y la URL lleva solo el token opaco —nunca el
 * nombre ni el correo, que son datos de una persona y quedarian en el log de
 * accesos del servidor—.
 *
 * Vive aparte de `altaDeUsuarioAction.test.ts` —que cubre la redaccion del
 * error y `altaDeUsuarioActionClave.test.ts` el transporte de la clave— por
 * tema y para que ninguno de los tres pase las 200 lineas de `AGENTS.md`.
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
      // `borradorEnCookie.ts` borra con `{ name, path }`, como pide Next.
      delete: (nombre: string | { name: string }) =>
        guardadas.delete(typeof nombre === "string" ? nombre : nombre.name),
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

const formulario = (campos: Record<string, string>) => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }
  return formData;
};

const CAPTURADO = {
  nombre: "Nueva Operadora",
  email: "nueva-sin-arroba",
  rol: "OPERADOR",
};

const COOKIE = "borrador-de-usuario";

const destino = () => String(redirectMock.mock.calls.at(-1)?.[0] ?? "");

const parametro = (nombre: string) =>
  new URLSearchParams(destino().slice(destino().indexOf("?") + 1)).get(nombre);

const borradorGuardado = () => {
  const guardada = cookies.guardadas.get(COOKIE);
  return guardada ? decodificarBorrador(guardada.valor) : null;
};

beforeEach(() => {
  vi.clearAllMocks();
  cookies.guardadas.clear();
  contextoActualMock.mockResolvedValue(CONTEXTO);
  altaDeUsuarioMock.mockResolvedValue({
    usuarioId: USUARIO_NUEVO,
    claveTemporal: "Kj7mPq2xRt9wNb4Y",
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("altaDeUsuarioAction y el borrador del rechazo", () => {
  it("un correo mal formado vuelve con lo capturado y solo el token en la URL", async () => {
    await expect(altaDeUsuarioAction(formulario(CAPTURADO))).rejects.toThrow(
      "REDIRECT:",
    );

    expect(parametro("error")).toBe("correo-invalido");
    expect(borradorGuardado()?.campos).toEqual(CAPTURADO);
    expect(parametro("borrador")).toBe(borradorGuardado()?.token);
    expect(cookies.guardadas.get(COOKIE)?.opciones).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/usuarios",
      maxAge: 120,
    });
    // El correo y el nombre son datos de una persona: no van a la URL.
    expect(destino()).not.toContain(CAPTURADO.email);
    expect(destino()).not.toContain("Nueva+Operadora");
    expect(altaDeUsuarioMock).not.toHaveBeenCalled();
  });

  it("un nombre corto vuelve con lo capturado y su propio mensaje", async () => {
    await expect(
      altaDeUsuarioAction(
        formulario({
          ...CAPTURADO,
          nombre: "ab",
          email: "n@motul.example.com",
        }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(parametro("error")).toBe("nombre-corto");
    expect(borradorGuardado()?.campos.nombre).toBe("ab");
    expect(altaDeUsuarioMock).not.toHaveBeenCalled();
  });

  it("el rol sin elegir vuelve con lo capturado y el rol vacio", async () => {
    await expect(
      altaDeUsuarioAction(
        formulario({ ...CAPTURADO, email: "n@motul.example.com", rol: "" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(parametro("error")).toBe("sin-rol");
    expect(borradorGuardado()?.campos).toEqual({
      nombre: "Nueva Operadora",
      email: "n@motul.example.com",
      rol: "",
    });
  });

  it("el rechazo del caso de uso tambien vuelve con lo capturado", async () => {
    altaDeUsuarioMock.mockRejectedValue(new Error("se cayo la base"));

    await expect(
      altaDeUsuarioAction(
        formulario({ ...CAPTURADO, email: "n@motul.example.com" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(parametro("error")).toBe("generico-alta");
    expect(borradorGuardado()?.campos.nombre).toBe(CAPTURADO.nombre);
  });

  it("el alta que prospera descarta el borrador viejo", async () => {
    cookies.guardadas.set(COOKIE, {
      valor: JSON.stringify({
        token: crypto.randomUUID(),
        campos: CAPTURADO,
      }),
      opciones: {},
    });

    await expect(
      altaDeUsuarioAction(
        formulario({ ...CAPTURADO, email: "n@motul.example.com" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(destino()).toMatch(/^\/usuarios\?clave=/);
    expect(cookies.guardadas.has(COOKIE)).toBe(false);
  });
});
