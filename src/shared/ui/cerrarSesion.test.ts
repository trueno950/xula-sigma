import { beforeEach, describe, expect, it, vi } from "vitest";
import { cerrarSesion, cerrarYVolver } from "./cerrarSesion";

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

  it("da por cerrada la sesion cuando el servidor responde bien", async () => {
    const enviar = vi.fn().mockResolvedValue({ ok: true });

    expect(await cerrarSesion(enviar)).toBe("cerrada");
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

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

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

  it("registra solo el nombre del error inesperado, no el objeto", async () => {
    const { correr } = armar(
      vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")),
    );

    await correr();

    expect(console.error).toHaveBeenCalledWith(
      "[cerrarSesion] fallo inesperado",
      "AbortError",
    );
  });
});
