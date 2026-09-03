import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `superficieActual`, aparte de `contexto.test.ts` porque es otro tema:
 * alla se prueba contra que ayuntamiento resuelve el request, aca que
 * superficie sirve -municipio, admin o raiz-.
 *
 * `withTenant.ts` abre el pool de Postgres al importarse, asi que se
 * mockea entero: sin esto el modulo lanza por falta de `DATABASE_URL`.
 */
const leerCabeceras = vi.hoisted(() => vi.fn());

vi.mock("./withTenant", () => ({ resolverAyuntamientoPorSubdominio: vi.fn() }));

vi.mock("next/headers", () => ({ headers: leerCabeceras }));

const { superficieActual } = await import("./contexto");

const conCabeceras = (mapa: Record<string, string>) => {
  leerCabeceras.mockResolvedValue({ get: (n: string) => mapa[n] ?? null });
};

/**
 * `superficieActual` lee la cabecera del proxy y nada mas. El respaldo por
 * host vivio aca un tiempo y se movio a `resolverHost` en `proxy.ts`: los
 * casos de derivacion se prueban alla.
 */
describe("superficieActual", () => {
  beforeEach(() => {
    leerCabeceras.mockReset();
  });

  it("devuelve la superficie que escribio el proxy", async () => {
    conCabeceras({ "x-xula-superficie": "ayuntamiento" });

    await expect(superficieActual()).resolves.toBe("ayuntamiento");
  });

  /**
   * Ni siquiera con un host que nombra municipio: el que decide es el
   * proxy, y aca ya no hay derivacion que lo pise.
   */
  it("un host ajeno no mueve la superficie escrita", async () => {
    conCabeceras({
      "x-xula-superficie": "raiz",
      "x-forwarded-host": "ticul.xula.localhost",
    });

    await expect(superficieActual()).resolves.toBe("raiz");
  });

  it("sin cabecera no hay superficie", async () => {
    conCabeceras({});

    await expect(superficieActual()).resolves.toBeNull();
  });
});
