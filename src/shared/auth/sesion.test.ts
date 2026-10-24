import { beforeEach, describe, expect, it, vi } from "vitest";
import { AyuntamientoInexistenteError } from "@/shared/lib/errores";

const conAuthMock = vi.hoisted(() => vi.fn());
const headersMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() =>
  vi.fn((): never => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
);

vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("./instancia", () => ({ conAuth: conAuthMock }));

const { sesionActual } = await import("./sesion");

describe("sesionActual", () => {
  beforeEach(() => {
    conAuthMock.mockReset();
    headersMock.mockReset();
    headersMock.mockResolvedValue(
      new Headers({ host: "motul.localhost:3000" }),
    );
    notFoundMock.mockClear();
  });

  it("usa notFound para un subdominio sin municipio", async () => {
    conAuthMock.mockRejectedValue(new AyuntamientoInexistenteError("otro"));

    await expect(sesionActual()).rejects.toThrow(
      "NEXT_HTTP_ERROR_FALLBACK;404",
    );
    expect(notFoundMock).toHaveBeenCalledOnce();
  });

  it("devuelve null cuando el municipio existe pero no hay sesion", async () => {
    conAuthMock.mockResolvedValue(null);

    await expect(sesionActual()).resolves.toBeNull();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("propaga otros errores de autenticacion", async () => {
    const error = new Error("fallo de autenticacion");
    conAuthMock.mockRejectedValue(error);

    await expect(sesionActual()).rejects.toBe(error);
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
