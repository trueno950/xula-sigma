import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * S12 de `intervenciones-ux`: cancelar pide una casilla, y el borde la vuelve
 * a exigir. Sin JavaScript no hay dialogo que pregunte antes, asi que un POST
 * a mano sin la confirmacion no puede cambiar el estado.
 */
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

const MENSAJE_SIN_CONFIRMAR =
  "Para cancelar la intervención, marque la casilla de confirmación.";

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

describe("confirmacion de la cancelacion", () => {
  it("rechaza una cancelacion sin la casilla y no cambia nada", async () => {
    await expect(
      cambiarEstadoAction(formDataDe({ id: ID, estadoNuevo: "CANCELADA" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(cambiarEstadoMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(decodeURIComponent(redirectMock.mock.calls[0]?.[0] as string)).toBe(
      `/intervenciones/${ID}?error=${MENSAJE_SIN_CONFIRMAR}`,
    );
  });

  it("acepta la cancelacion con la casilla marcada", async () => {
    cambiarEstadoMock.mockResolvedValue(undefined);

    await expect(
      cambiarEstadoAction(
        formDataDe({ id: ID, estadoNuevo: "CANCELADA", confirmar: "si" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(cambiarEstadoMock).toHaveBeenCalledWith(
      { id: ID, estadoNuevo: "CANCELADA" },
      contexto,
    );
  });

  it("no pide confirmacion para un avance que no es cancelacion", async () => {
    cambiarEstadoMock.mockResolvedValue(undefined);

    await expect(
      cambiarEstadoAction(formDataDe({ id: ID, estadoNuevo: "EN_EJECUCION" })),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(cambiarEstadoMock).toHaveBeenCalledWith(
      { id: ID, estadoNuevo: "EN_EJECUCION" },
      contexto,
    );
  });
});
