import { describe, expect, it, vi } from "vitest";
import { cerrarSesion } from "./cerrarSesion";

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
