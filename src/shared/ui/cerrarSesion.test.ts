import { afterEach, describe, expect, it, vi } from "vitest";
import { cerrarSesion, cerrarYVolver } from "./cerrarSesion";

afterEach(() => vi.useRealTimers());

describe("cerrarSesion", () => {
  it("pide el cierre a la puerta unica de autenticacion, por POST", async () => {
    const enviar = vi.fn().mockResolvedValue({ ok: true });

    await cerrarSesion(enviar);

    expect(enviar).toHaveBeenCalledTimes(1);
    const [url, opciones] = enviar.mock.calls[0] ?? [];

    expect(url).toBe("/api/auth/sign-out");
    expect(opciones).toMatchObject({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
  });

  it("da por cerrada la sesion y limpia el timeout si el servidor responde", async () => {
    vi.useFakeTimers();
    const enviar = vi.fn().mockResolvedValue({ ok: true });

    expect(await cerrarSesion(enviar)).toBe("cerrada");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("no da por cerrada la sesion cuando el servidor rechaza", async () => {
    const enviar = vi.fn().mockResolvedValue({ ok: false });

    expect(await cerrarSesion(enviar)).toBe("fallida");
  });

  it("no da por cerrada la sesion cuando no hay red", async () => {
    const enviar = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    expect(await cerrarSesion(enviar)).toBe("fallida");
  });

  it("no oculta un error que no es de red", async () => {
    const enviar = vi.fn().mockRejectedValue(new RangeError("otro fallo"));

    await expect(cerrarSesion(enviar)).rejects.toThrow("otro fallo");
  });
});

describe("cerrarYVolver", () => {
  const armar = (enviar: Parameters<typeof cerrarYVolver>[0]["enviar"]) => {
    const irA = vi.fn();
    const marcar = vi.fn();

    return {
      irA,
      marcar,
      correr: () => cerrarYVolver({ enviar, irA, marcar }),
    };
  };

  it("marca el cierre en curso y, si sale bien, va a /acceso del mismo host", async () => {
    const { irA, marcar, correr } = armar(
      vi.fn().mockResolvedValue({ ok: true }),
    );

    await correr();

    expect(marcar).toHaveBeenNthCalledWith(1, { enCurso: true, fallo: false });
    expect(marcar).toHaveBeenCalledTimes(1);
    expect(irA).toHaveBeenCalledExactlyOnceWith("/acceso");
  });

  it.each([
    ["el servidor rechaza", () => Promise.resolve({ ok: false })],
    ["no hay red", () => Promise.reject(new TypeError("Failed to fetch"))],
    [
      "la peticion se aborta",
      () => Promise.reject(new DOMException("aborted", "AbortError")),
    ],
  ])(
    "si %s, avisa del fallo, rehabilita el boton y no navega",
    async (_, respuesta) => {
      const { irA, marcar, correr } = armar(vi.fn(respuesta));

      await expect(correr()).resolves.toBeUndefined();

      expect(marcar).toHaveBeenLastCalledWith({ enCurso: false, fallo: true });
      expect(irA).not.toHaveBeenCalled();
    },
  );

  it("aborta una peticion sin respuesta y rehabilita el boton para reintentar", async () => {
    vi.useFakeTimers();
    const enviar = vi.fn(
      (_url: string, opciones: RequestInit): Promise<Pick<Response, "ok">> => {
        return new Promise((_, reject) => {
          opciones.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        });
      },
    );
    const { irA, marcar, correr } = armar(enviar);
    const cierre = correr();
    const signal = enviar.mock.calls[0]?.[1]?.signal;

    expect(signal).toBeInstanceOf(AbortSignal);

    await vi.advanceTimersByTimeAsync(15_000);
    await cierre;

    expect(signal?.aborted).toBe(true);
    expect(marcar).toHaveBeenLastCalledWith({ enCurso: false, fallo: true });
    expect(irA).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("propaga los defectos inesperados despues de restaurar el boton", async () => {
    const { marcar, correr } = armar(
      vi.fn().mockRejectedValue(new RangeError("detalle privado")),
    );

    await expect(correr()).rejects.toThrow(RangeError);

    expect(marcar).toHaveBeenLastCalledWith({ enCurso: false, fallo: true });
  });
});
