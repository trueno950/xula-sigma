import { beforeEach, describe, expect, it, vi } from "vitest";
import { TenantNoResueltoError } from "@/shared/lib/errores";

/**
 * `withTenant.ts` abre el pool de Postgres al importarse, asi que se mockea
 * entero: sin esto el modulo lanza por falta de `DATABASE_URL` y este test
 * dejaria de ser unitario.
 */
const resolver = vi.hoisted(() => vi.fn());
const leerCabeceras = vi.hoisted(() => vi.fn());

vi.mock("./withTenant", () => ({
  resolverAyuntamientoPorSubdominio: resolver,
}));

vi.mock("next/headers", () => ({ headers: leerCabeceras }));

const { ayuntamientoActual } = await import("./contexto");

/**
 * El mock responde por nombre de cabecera y no una sola cadena para todas.
 * La version anterior devolvia el mismo valor a cualquier `get`, y con eso
 * el respaldo por host no se ejercitaba nunca: con valor, cortaba en la
 * cabecera del proxy; sin valor, los tres nombres daban `null`.
 */
const conCabeceras = (mapa: Record<string, string>) => {
  leerCabeceras.mockResolvedValue({ get: (n: string) => mapa[n] ?? null });
};

const conCabecera = (valor: string | null) => {
  conCabeceras(valor ? { "x-xula-subdominio": valor } : {});
};

const ticul = {
  id: "11111111-1111-4111-8111-111111111111",
  subdominio: "ticul",
  nombre: "Ticul",
  marca: {},
};

describe("ayuntamientoActual", () => {
  beforeEach(() => {
    resolver.mockReset();
    leerCabeceras.mockReset();
  });

  it("devuelve el ayuntamiento que resuelve el subdominio de la cabecera", async () => {
    conCabecera("ticul");
    resolver.mockResolvedValue(ticul);

    await expect(ayuntamientoActual()).resolves.toMatchObject({
      subdominio: "ticul",
    });
    expect(resolver).toHaveBeenCalledWith("ticul");
  });

  it("sin cabecera ni host lanza: es un error de configuracion del matcher", async () => {
    conCabecera(null);

    await expect(ayuntamientoActual()).rejects.toBeInstanceOf(
      TenantNoResueltoError,
    );
    // No se consulta la base cuando el proxy no corrio.
    expect(resolver).not.toHaveBeenCalled();
  });

  /**
   * El caso que el comentario del codigo afirmaba y nadie verificaba.
   *
   * Un subdominio con forma valida que no existe se trata igual que uno
   * ausente: la misma excepcion, sin distinguir. Devolver algo distinto
   * —un 403, o un mensaje mas especifico— confirmaria al que prueba
   * nombres cual municipio esta dado de alta y cual no.
   */
  it("un subdominio inexistente no se distingue de uno ausente", async () => {
    conCabecera("municipio-que-no-existe");
    resolver.mockResolvedValue(null);

    const inexistente = await ayuntamientoActual().catch((e) => e);
    conCabecera(null);
    const ausente = await ayuntamientoActual().catch((e) => e);

    expect(inexistente).toBeInstanceOf(TenantNoResueltoError);
    expect(ausente).toBeInstanceOf(TenantNoResueltoError);
    expect(inexistente.codigo).toBe(ausente.codigo);
  });
});
