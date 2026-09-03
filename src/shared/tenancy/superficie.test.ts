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
 * La superficie del render sintetico, que es donde la cabecera del proxy
 * miente: ese request interno si pasa por el proxy, con `host` puesto al
 * dominio base pelado, y el proxy lo resuelve como `raiz`.
 *
 * Costo de no tener esto: `(panel)/layout.tsx` llamaba `notFound()` y la
 * pantalla respondia 404 justo despues de guardar.
 */
describe("superficieActual", () => {
  beforeEach(() => {
    leerCabeceras.mockReset();
  });

  it("un municipio nombrado por el host le gana a una `raiz` escrita", async () => {
    conCabeceras({
      "x-xula-superficie": "raiz",
      host: "localhost:3000",
      "x-forwarded-host": "ticul.localhost:3000",
    });

    await expect(superficieActual()).resolves.toBe("ayuntamiento");
  });

  /**
   * `admin` es una superficie de verdad y no se pisa: el panel de
   * SUPER_ADMIN vive fuera del espacio de tenants a proposito.
   */
  it("`admin` no se pisa aunque un host nombre municipio", async () => {
    conCabeceras({
      "x-xula-superficie": "admin",
      "x-forwarded-host": "ticul.localhost:3000",
    });

    await expect(superficieActual()).resolves.toBe("admin");
  });

  it("la raiz de verdad sigue siendo raiz", async () => {
    conCabeceras({ "x-xula-superficie": "raiz", host: "localhost:3000" });

    await expect(superficieActual()).resolves.toBe("raiz");
  });

  it("sin cabecera ni host no hay superficie", async () => {
    conCabeceras({});

    await expect(superficieActual()).resolves.toBeNull();
  });
});
