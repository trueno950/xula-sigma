import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { NOMBRE_COOKIE_AVISO, RUTA_COOKIE_AVISO } from "../avisoEnTransito";

/**
 * S6 y S7 en el borde de la accion: la baja es logica y se confirma en el
 * listado; un `usuarioId` de otro municipio llega como «El recurso no
 * existe.» —nunca como 403— porque el caso de uso resuelve el objetivo bajo
 * RLS antes de mirar el rol. S12 agrega la casilla: sin ella no se llama al
 * caso de uso, asi que no hay fila que tocar.
 *
 * S13 y S14: el aviso viaja en una cookie httpOnly, la URL lleva solo su
 * token y el proxy borra la cookie en la unica peticion que lo trae.
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

const parametro = (nombre: string) => {
  const url = destino();
  return new URLSearchParams(url.slice(url.indexOf("?") + 1)).get(nombre);
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

    expect(parametro("error")).toBe("sin-destinatario");
    expect(darDeBajaMock).not.toHaveBeenCalled();
  });

  it("un usuario de otro municipio se lee como que no existe", async () => {
    darDeBajaMock.mockRejectedValue(new NoEncontradoError());

    await expect(
      darDeBajaUsuarioAction(
        formulario({ usuarioId: OPERADOR, confirmar: "si" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(parametro("error")).toBe("no-encontrado");
    expect(parametro("ok")).toBeNull();
    expect(parametro("aviso")).toBeNull();
  });

  it("sin permiso lleva el codigo que la pantalla traduce", async () => {
    darDeBajaMock.mockRejectedValue(new NoAutorizadoError());

    await expect(
      darDeBajaUsuarioAction(
        formulario({ usuarioId: OPERADOR, confirmar: "si" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(parametro("error")).toBe("sin-permiso");
  });

  /**
   * S12 de `usuarios-ux`: sin JavaScript no hay dialogo que pregunte antes,
   * asi que la casilla es lo unico que separa un clic de una baja, y el
   * borde la exige otra vez. Un POST a mano sin ella no cambia nada.
   */
  it("sin la casilla de confirmacion no da de baja a nadie", async () => {
    await expect(
      darDeBajaUsuarioAction(formulario({ usuarioId: OPERADOR })),
    ).rejects.toThrow("REDIRECT:");

    expect(destino()).toBe("/usuarios?error=baja-sin-confirmar");
    expect(darDeBajaMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(cookiesMock).not.toHaveBeenCalled();
  });

  it("una confirmacion con otro valor tampoco alcanza", async () => {
    await expect(
      darDeBajaUsuarioAction(
        formulario({ usuarioId: OPERADOR, confirmar: "no" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(parametro("error")).toBe("baja-sin-confirmar");
    expect(darDeBajaMock).not.toHaveBeenCalled();
  });

  it("el exito guarda el aviso en una cookie y lleva solo su token en la URL", async () => {
    await expect(
      darDeBajaUsuarioAction(
        formulario({ usuarioId: OPERADOR, confirmar: "si" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    const [nombre, valor, opciones] = cookiesMock.mock.calls.at(-1) ?? [];
    const aviso = JSON.parse(String(valor));

    expect(nombre).toBe(NOMBRE_COOKIE_AVISO);
    expect(aviso).toEqual({ token: expect.any(String), usuarioId: OPERADOR });
    expect(opciones).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: RUTA_COOKIE_AVISO,
      maxAge: 120,
    });
    expect(destino()).toBe(`/usuarios?aviso=${aviso.token}&ok=baja`);
    expect(destino()).not.toContain("Operadora");
    expect(darDeBajaMock).toHaveBeenCalledWith(CONTEXTO, {
      usuarioId: OPERADOR,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/usuarios");
  });

  /**
   * La baja ya ocurrio: si el aviso no se puede guardar, la operadora se
   * queda sin el. El listado dice el estado igual, y la accion vuelve sin
   * anunciar nada en vez de terminar en un 500.
   */
  it("si el aviso no se puede guardar, la baja se informa igual", async () => {
    cookiesMock.mockImplementation(() => {
      throw new Error("no hay donde escribir la cookie");
    });

    await expect(
      darDeBajaUsuarioAction(
        formulario({ usuarioId: OPERADOR, confirmar: "si" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(darDeBajaMock).toHaveBeenCalledTimes(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/usuarios");
    expect(destino()).toBe("/usuarios?ok=baja");
  });

  it("una falla desconocida cae en el generico", async () => {
    darDeBajaMock.mockRejectedValue(new Error("se cayo la base"));

    await expect(
      darDeBajaUsuarioAction(
        formulario({ usuarioId: OPERADOR, confirmar: "si" }),
      ),
    ).rejects.toThrow("REDIRECT:");

    expect(parametro("error")).toBe("generico-baja");
  });
});
