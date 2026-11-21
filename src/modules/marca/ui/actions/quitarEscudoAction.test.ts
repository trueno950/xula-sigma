import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import { NoAutorizadoError } from "@/shared/lib/errores";
import {
  MENSAJE_DE_CONFIRMACION_DE_MARCA,
  MENSAJES_DE_ERROR_DE_MARCA,
} from "../mensajesDeMarca";

/**
 * El borde de `quitarEscudoAction` (S7).
 *
 * La casilla no es un adorno del formulario: el servidor la vuelve a exigir
 * **antes** del caso de uso, asi que un POST a mano sin ella no borra la
 * referencia ni toca el objeto guardado. Igual que la baja de usuarios y el
 * restablecimiento de colores, la respuesta viaja como **codigo** en la URL y
 * la oracion la pone la pantalla (S4).
 */

const contextoActualMock = vi.fn<() => Promise<ContextoActual | null>>();
const quitarEscudoMock = vi.fn();
const revalidatePathMock = vi.fn();
const redirigirMock = vi.fn((ruta: string): never => {
  throw new Error(`REDIRECT:${ruta}`);
});

vi.mock("@/shared/auth", () => ({ contextoActual: contextoActualMock }));
vi.mock("../../composicion", () => ({ quitarEscudo: quitarEscudoMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next/navigation", () => ({ redirect: redirigirMock }));

const { quitarEscudoAction } = await import("./quitarEscudoAction");

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

const destino = (): URL => {
  const [ruta] = redirigirMock.mock.calls.at(-1) ?? [""];

  return new URL(ruta, "http://motul.xula.localhost");
};

const ejecutar = (campos: Record<string, string>) =>
  expect(quitarEscudoAction(formulario(campos))).rejects.toThrow("REDIRECT");

beforeEach(() => {
  vi.clearAllMocks();
  contextoActualMock.mockResolvedValue(contexto);
  quitarEscudoMock.mockResolvedValue(undefined);
});

describe("quitarEscudoAction", () => {
  it("sin la casilla no toca nada y lo dice con un codigo", async () => {
    await ejecutar({ ambito: "escudo" });

    expect(quitarEscudoMock).not.toHaveBeenCalled();
    expect(destino().searchParams.get("error")).toBe("quitar-sin-confirmar");
    expect(MENSAJES_DE_ERROR_DE_MARCA["quitar-sin-confirmar"]).toBe(
      "Para quitar el escudo, marque la casilla de confirmación.",
    );
  });

  it("una casilla con otro valor tampoco confirma", async () => {
    await ejecutar({ ambito: "escudo", confirmar: "no" });

    expect(quitarEscudoMock).not.toHaveBeenCalled();
    expect(destino().searchParams.get("error")).toBe("quitar-sin-confirmar");
  });

  it("con la casilla y el ambito correcto quita el escudo", async () => {
    await ejecutar({ ambito: "escudo", confirmar: "si" });

    expect(quitarEscudoMock).toHaveBeenCalledWith(contexto);
    expect(destino().searchParams.get("ok")).toBe("escudo-quitado");
    expect(MENSAJE_DE_CONFIRMACION_DE_MARCA["escudo-quitado"]).toBe(
      "Se quitó el escudo.",
    );
  });

  it("un ambito que no es escudo no dispara el borrado", async () => {
    // El dia que `/marca` tenga otro «quitar», un formulario viejo en una
    // pestana abierta no puede terminar borrando el escudo.
    await ejecutar({ ambito: "colores", confirmar: "si" });

    expect(quitarEscudoMock).not.toHaveBeenCalled();
    expect(destino().searchParams.get("error")).toBe("escudo-no-quitado");
  });

  it("un rol sin permiso vuelve con su codigo", async () => {
    quitarEscudoMock.mockRejectedValue(new NoAutorizadoError());

    await ejecutar({ ambito: "escudo", confirmar: "si" });

    expect(destino().searchParams.get("error")).toBe("sin-permiso");
  });

  it("un fallo del caso de uso no filtra su texto a la URL", async () => {
    quitarEscudoMock.mockRejectedValue(new Error("R2 explotó en el intento 3"));

    await ejecutar({ ambito: "escudo", confirmar: "si" });

    const url = destino();

    expect(url.searchParams.get("error")).toBe("escudo-no-quitado");
    expect(decodeURIComponent(url.search)).not.toContain("R2");
  });
});
