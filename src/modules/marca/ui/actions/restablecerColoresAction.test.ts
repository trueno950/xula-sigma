import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";
import { MENSAJES_DE_ERROR_DE_MARCA } from "../mensajesDeMarca";

/**
 * El borde de `restablecerColoresAction` (S2 y S4).
 *
 * S2: la casilla de confirmacion no es un adorno del formulario — el servidor
 * la vuelve a exigir **antes** del caso de uso, asi que un POST a mano sin
 * ella no cambia nada.
 *
 * S4: el rechazo viaja como codigo. La oracion que lee la operadora la pone
 * la pantalla, y el `?error=` de la URL nunca se pinta tal cual.
 */

const contextoActualMock = vi.fn<() => Promise<ContextoActual | null>>();
const restablecerColoresMock = vi.fn();
const revalidatePathMock = vi.fn();
const redirigirMock = vi.fn((ruta: string): never => {
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

const codigoDelError = (): string | null =>
  destinoDelRedirect().searchParams.get("error");

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

    await ejecutar({ ambito: "colores", confirmar: "si" });

    expect(destinoDelRedirect().pathname).toBe("/acceso");
    expect(restablecerColoresMock).not.toHaveBeenCalled();
  });

  it("sin la casilla de confirmacion no restablece nada (S2)", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    await ejecutar({ ambito: "colores" });

    expect(codigoDelError()).toBe("restablecimiento-sin-confirmar");
    expect(restablecerColoresMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("una confirmacion que no es `si` tampoco alcanza", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    await ejecutar({ ambito: "colores", confirmar: "no" });

    expect(codigoDelError()).toBe("restablecimiento-sin-confirmar");
    expect(restablecerColoresMock).not.toHaveBeenCalled();
  });

  it("un formulario que no dice que restablece no toca la marca", async () => {
    contextoActualMock.mockResolvedValue(contexto);

    await ejecutar({ confirmar: "si" });

    expect(codigoDelError()).toBe("restablecimiento-no-hecho");
    expect(restablecerColoresMock).not.toHaveBeenCalled();
  });

  it("con la casilla restablece con el contexto del servidor y confirma", async () => {
    contextoActualMock.mockResolvedValue(contexto);
    restablecerColoresMock.mockResolvedValue(undefined);

    await ejecutar({ ambito: "colores", confirmar: "si" });

    expect(restablecerColoresMock).toHaveBeenCalledWith(contexto);
    expect(destinoDelRedirect().searchParams.get("ok")).toBe(
      "colores-restablecidos",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/marca");
  });

  it("un rol sin permiso sale con el codigo de la pantalla, no con el de la excepcion", async () => {
    const negado = new NoAutorizadoError();
    contextoActualMock.mockResolvedValue(contexto);
    restablecerColoresMock.mockRejectedValue(negado);

    await ejecutar({ ambito: "colores", confirmar: "si" });

    expect(codigoDelError()).toBe("sin-permiso");
    expect(destinoDelRedirect().search).not.toContain(
      encodeURIComponent(negado.message),
    );
    expect(MENSAJES_DE_ERROR_DE_MARCA["sin-permiso"]).not.toBe(negado.message);
  });
});
