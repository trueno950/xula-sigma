import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NoAutorizadoError,
  NoEncontradoError,
  TenantNoResueltoError,
  ValidacionError,
} from "@/shared/lib/errores";
import {
  IntervencionCerradaError,
  TransicionInvalidaError,
} from "../../domain";

const redirectMock = vi.hoisted(() =>
  vi.fn((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  }),
);
const revalidatePathMock = vi.hoisted(() => vi.fn());
const contextoActualMock = vi.hoisted(() => vi.fn());
const cambiarEstadoMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  cambiarEstadoDeIntervencion: cambiarEstadoMock,
}));

const { cambiarEstadoAction } = await import("./cambiarEstadoAction");

const ID = "33333333-3333-4333-8333-333333333333";
const contexto = {
  ayuntamientoId: "11111111-1111-4111-8111-111111111111",
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" as const },
  origen: "web",
};

const formDataDe = (campos: Record<string, string>): FormData => {
  const formData = new FormData();
  for (const [clave, valor] of Object.entries(campos))
    formData.set(clave, valor);
  return formData;
};

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((_url?: string): never => {
    throw new Error("NEXT_REDIRECT");
  });
  contextoActualMock.mockResolvedValue(contexto);
});

describe("acciones de administracion de intervenciones", () => {
  it("rechaza un estado invalido en el borde sin invocar el caso de uso", async () => {
    await expect(
      cambiarEstadoAction(formDataDe({ id: ID, estadoNuevo: "BORRADOR" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(cambiarEstadoMock).not.toHaveBeenCalled();
    expect(redirectMock.mock.calls[0]?.[0]).toContain("error=");
  });

  it("redacta el rechazo de autorizacion sin ocultar la guarda del caso de uso", async () => {
    cambiarEstadoMock.mockRejectedValue(new NoAutorizadoError());

    await expect(
      cambiarEstadoAction(formDataDe({ id: ID, estadoNuevo: "CANCELADA" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(cambiarEstadoMock).toHaveBeenCalledWith(
      { id: ID, estadoNuevo: "CANCELADA" },
      contexto,
    );
    expect(
      decodeURIComponent(redirectMock.mock.calls[0]?.[0] as string),
    ).toContain("No tiene permiso");
  });

  it.each([
    [
      "no encontrado",
      new NoEncontradoError("detalle interno de la fila"),
      "Esa intervencion no existe.",
    ],
    [
      "intervencion cerrada",
      new IntervencionCerradaError(),
      "La intervencion ya esta en un estado terminal.",
    ],
    [
      "transicion invalida",
      new TransicionInvalidaError(),
      "La transicion de estado no es valida.",
    ],
    [
      "validacion",
      new ValidacionError({}, "La transicion no tiene datos validos."),
      "La transicion no tiene datos validos.",
    ],
  ])("mapea %s al mensaje de negocio", async (_caso, error, mensaje) => {
    cambiarEstadoMock.mockRejectedValue(error);

    await expect(
      cambiarEstadoAction(formDataDe({ id: ID, estadoNuevo: "CANCELADA" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(
      decodeURIComponent(redirectMock.mock.calls[0]?.[0] as string),
    ).toContain(mensaje);
  });

  it("usa un mensaje generico y conserva el log seguro ante una falla inesperada", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const secreto = "detalle interno de la fila";
    cambiarEstadoMock.mockRejectedValue(new Error(secreto));

    await expect(
      cambiarEstadoAction(formDataDe({ id: ID, estadoNuevo: "CANCELADA" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(decodeURIComponent(redirectMock.mock.calls[0]?.[0] as string)).toBe(
      `/intervenciones/${ID}?error=No se pudo cambiar el estado. Intente de nuevo.`,
    );
    expect(consoleError).toHaveBeenCalledWith(
      "[intervenciones] cambio de estado fallo",
      expect.objectContaining({ campos: { name: "Error" } }),
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(secreto);
    consoleError.mockRestore();
  });

  it("redacta una falla al resolver el contexto sin dejarla escapar", async () => {
    contextoActualMock.mockRejectedValue(
      new TenantNoResueltoError("detalle interno del tenant"),
    );

    await expect(
      cambiarEstadoAction(formDataDe({ id: ID, estadoNuevo: "CANCELADA" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(cambiarEstadoMock).not.toHaveBeenCalled();
    expect(decodeURIComponent(redirectMock.mock.calls[0]?.[0] as string)).toBe(
      `/intervenciones/${ID}?error=No se pudo determinar el ayuntamiento del acceso.`,
    );
  });
  it("redirige a acceso si falta el contexto", async () => {
    contextoActualMock.mockResolvedValue(null);
    await expect(
      cambiarEstadoAction(formDataDe({ id: ID, estadoNuevo: "CANCELADA" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/acceso");
  });

  it("cambia el estado con el contexto del servidor y revalida la ficha", async () => {
    cambiarEstadoMock.mockResolvedValue(undefined);

    await expect(
      cambiarEstadoAction(formDataDe({ id: ID, estadoNuevo: "CANCELADA" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(cambiarEstadoMock).toHaveBeenCalledWith(
      { id: ID, estadoNuevo: "CANCELADA" },
      contexto,
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(`/intervenciones/${ID}`);
  });
});
