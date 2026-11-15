import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { MENSAJES_DE_ERROR_DE_MARCA } from "../mensajesDeMarca";

/**
 * El borde de `restablecerColoresAction` (S5, S8): sin campos de color, lo
 * unico que valida es que el formulario diga que restablece —asi un
 * formulario viejo no dispara otra cosa— y que el permiso y las oraciones
 * salgan del mismo lugar que en el alta de colores.
 */

const contextoActualMock = vi.fn<() => Promise<ContextoActual | null>>();
const restablecerColoresMock = vi.fn();
const revalidatePathMock = vi.fn();
const redirigirMock = vi.fn((ruta: string) => {
  throw new Error(`REDIRECT:${ruta}`);
});

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({
  restablecerColores: restablecerColoresMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({ redirect: redirigirMock }));

const { restablecerColoresAction } = await import("./restablecerColoresAction");

const contexto: ContextoActual = {
  ayuntamientoId: "motul" as ContextoActual["ayuntamientoId"],
  usuario: { id: "usuario-1", rol: "ADMIN_MUNICIPAL" },
  origen: "web",
};

const formulario = (campos: Record<string, string>): FormData => {
  const formData = new FormData();

  for (const [clave, valor] of Object.entries(campos)) {
    formData.set(clave, valor);
  }

  return formData;
};

const destinoDelRedirect = (): URL => {
  const [ruta] = redirigirMock.mock.calls.at(-1) ?? [""];

  return new URL(ruta, "http://motul.xula.localhost");
};

const ejecutar = (campos: Record<string, string>) =>
  expect(restablecerColoresAction(formulario(campos))).rejects.toThrow(
    "REDIRECT",
  );

describe("restablecerColoresAction", () => {
  beforeEach(() => {
    contextoActualMock.mockReset();
    restablecerColoresMock.mockReset();
    revalidatePathMock.mockReset();
    redirigirMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sin sesion manda al acceso y no llama al caso de uso", async () => {
    contextoActualMock.mockResolvedValue(null);

    await ejecutar({ ambito: "colores" });

    expect(destinoDelRedirect().pathname).toBe("/acceso");
    expect(restablecerColoresMock).not.toHaveBeenCalled();
  });

  it("un formulario que no dice que restablece no toca la marca", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    await ejecutar({});

    expect(destinoDelRedirect().searchParams.get("error")).toBe(
      MENSAJES_DE_ERROR_DE_MARCA.restablecimientoFallido,
    );
    expect(restablecerColoresMock).not.toHaveBeenCalled();
  });

  it("restablece con el contexto del servidor y confirma", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    restablecerColoresMock.mockResolvedValue(undefined);

    await ejecutar({ ambito: "colores" });

    expect(restablecerColoresMock).toHaveBeenCalledWith(contexto);
    expect(destinoDelRedirect().searchParams.get("ok")).toBe(
      "colores-restablecidos",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/marca");
  });

  it("un rol sin permiso sale con la oracion de la pantalla", async () => {
    const negado = new NoAutorizadoError();
    contextoActualMock.mockResolvedValue(contexto);
    restablecerColoresMock.mockRejectedValue(negado);

    await ejecutar({ ambito: "colores" });

    const mensaje = destinoDelRedirect().searchParams.get("error");

    expect(mensaje).toBe(MENSAJES_DE_ERROR_DE_MARCA.sinPermiso);
    expect(mensaje).not.toBe(negado.message);
  });
});
