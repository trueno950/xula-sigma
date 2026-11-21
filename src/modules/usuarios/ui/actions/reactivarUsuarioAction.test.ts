import { beforeEach, describe, expect, it, vi } from "vitest";
import { CuentaActivaError } from "@/shared/auth";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError, NoEncontradoError } from "@/shared/lib/errores";
import { decodificarClaveMostrada } from "../claveMostrada";

/**
 * S3 en el borde de la accion: reactivar emite una temporal nueva que la
 * pantalla muestra una sola vez **por el mismo transporte que un
 * restablecimiento** —cookie httpOnly y token opaco en la URL, nunca la
 * clave— y la confirmacion se exige dos veces, en el formulario y aca, igual
 * que en la baja. Los rechazos llegan como codigo: la pantalla redacta
 * (`mensajesDeError.ts`) y el texto de la excepcion no viaja.
 */

const contextoActualMock = vi.hoisted(() => vi.fn());
const reactivarMock = vi.hoisted(() => vi.fn());
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
  reactivarUsuario: reactivarMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/headers", () => ({ cookies: async () => cookies.almacen }));

const { reactivarUsuarioAction } = await import("./reactivarUsuarioAction");

const CONTEXTO: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const OPERADOR = "55555555-5555-4555-8555-555555555555";

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

const claveMostrada = () =>
  decodificarClaveMostrada(
    cookies.guardadas.get("clave-temporal-de-usuario")?.valor,
  );

const confirmando = (campos: Record<string, string> = {}) =>
  formulario({ usuarioId: OPERADOR, confirmar: "si", ...campos });

beforeEach(() => {
  vi.clearAllMocks();
  cookies.guardadas.clear();
  contextoActualMock.mockResolvedValue(CONTEXTO);
  reactivarMock.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("reactivarUsuarioAction", () => {
  it("sin sesion manda al acceso y no reactiva a nadie", async () => {
    contextoActualMock.mockResolvedValue(null);

    await expect(reactivarUsuarioAction(confirmando())).rejects.toThrow(
      "REDIRECT:/acceso",
    );
    expect(reactivarMock).not.toHaveBeenCalled();
  });

  it("sin persona nombrada vuelve al listado con su mensaje", async () => {
    const formularioSinUuid = formulario({
      usuarioId: "no-es-uuid",
      confirmar: "si",
    });

    await expect(reactivarUsuarioAction(formularioSinUuid)).rejects.toThrow(
      "REDIRECT:",
    );

    expect(parametro("error")).toBe("sin-destinatario");
    expect(reactivarMock).not.toHaveBeenCalled();
  });

  /** La confirmacion es del servidor, no del navegador: un POST a mano sin
   * la casilla no reactiva a nadie ni escribe cookie. */
  it("sin la casilla de confirmacion no reactiva a nadie", async () => {
    await expect(
      reactivarUsuarioAction(formulario({ usuarioId: OPERADOR })),
    ).rejects.toThrow("REDIRECT:");

    expect(destino()).toBe("/usuarios?error=reactivacion-sin-confirmar");
    expect(reactivarMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(cookies.guardadas.size).toBe(0);
  });

  it.each([
    [new NoEncontradoError(), "no-encontrado"],
    [new NoAutorizadoError(), "sin-permiso"],
    [new CuentaActivaError(), "cuenta-activa"],
  ])(
    "un rechazo del caso de uso vuelve con su codigo y sin clave que mostrar (%o)",
    async (error, codigo) => {
      reactivarMock.mockRejectedValue(error);

      await expect(reactivarUsuarioAction(confirmando())).rejects.toThrow(
        "REDIRECT:",
      );

      expect(destino()).toBe(`/usuarios?error=${codigo}`);
      expect(cookies.guardadas.has("clave-temporal-de-usuario")).toBe(false);
    },
  );

  it("si la clave no se puede guardar, la reactivacion se informa igual", async () => {
    const escribir = vi.spyOn(cookies.almacen, "set").mockImplementation(() => {
      throw new Error("no hay donde escribir la cookie");
    });

    try {
      await expect(reactivarUsuarioAction(confirmando())).rejects.toThrow(
        "REDIRECT:",
      );

      expect(destino()).toBe("/usuarios?error=clave-no-mostrada-reactivacion");
      expect(reactivarMock).toHaveBeenCalledTimes(1);
      expect(revalidatePathMock).toHaveBeenCalledWith("/usuarios");
    } finally {
      escribir.mockRestore();
    }
  });

  it("la clave de la reactivacion viaja en la cookie, no en la URL", async () => {
    await expect(reactivarUsuarioAction(confirmando())).rejects.toThrow(
      "REDIRECT:",
    );

    const mostrada = claveMostrada();
    const [, { nuevaClave }] = reactivarMock.mock.calls.at(-1) ?? [];

    expect(nuevaClave).toEqual(expect.any(String));
    expect(mostrada).toMatchObject({
      motivo: "reactivacion",
      usuarioId: OPERADOR,
      clave: nuevaClave,
    });
    expect(destino()).toBe(
      `/usuarios?clave=${mostrada?.token}&ok=reactivacion`,
    );
    expect(destino()).not.toContain(nuevaClave);
    expect(
      cookies.guardadas.get("clave-temporal-de-usuario")?.opciones,
    ).toMatchObject({ httpOnly: true, path: "/usuarios", maxAge: 120 });
    // S11 de `usuarios-ux`: el destinatario se recuerda para cuando la clave
    // ya no se pueda mostrar.
    expect(cookies.guardadas.has("destinatario-de-la-clave")).toBe(true);
    expect(revalidatePathMock).toHaveBeenCalledWith("/usuarios");
  });
});
