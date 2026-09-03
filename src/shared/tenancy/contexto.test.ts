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

/**
 * El respaldo por host: el render sintetico del redirect de un Server
 * Action no trae las cabeceras que escribio el proxy.
 *
 * Que este derivado del host —que lo manda el cliente— no lo vuelve una
 * eleccion libre de tenant: quien nombra otro municipio pierde su propia
 * sesion, porque la busqueda de sesion corre bajo RLS con este mismo
 * tenant. Esa cadena se prueba contra Postgres en
 * `shared/auth/accesoCruzado.integration.test.ts`; aca solo se fija de
 * donde sale el valor y en que orden.
 */
describe("respaldo por host cuando el proxy no escribio su cabecera", () => {
  beforeEach(() => {
    resolver.mockReset();
    leerCabeceras.mockReset();
    resolver.mockResolvedValue(ticul);
  });

  it("deriva el tenant de `host`", async () => {
    conCabeceras({ host: "ticul.localhost:3000" });

    await expect(ayuntamientoActual()).resolves.toMatchObject({
      subdominio: "ticul",
    });
    expect(resolver).toHaveBeenCalledWith("ticul");
  });

  /**
   * El render sintetico: `host` es el del propio servidor -no nombra
   * municipio- y el original quedo en `x-forwarded-host`. Es el unico caso
   * para el que existe este respaldo.
   */
  it("cae a `x-forwarded-host` cuando `host` no nombra municipio", async () => {
    conCabeceras({
      host: "localhost:3000",
      "x-forwarded-host": "ticul.localhost:3000",
    });

    await ayuntamientoActual();

    expect(resolver).toHaveBeenCalledWith("ticul");
  });

  /**
   * El orden es la reja, no una preferencia.
   *
   * `x-forwarded-host` es la unica de las dos que un cliente agrega sin
   * tocar la que su navegador ya fija. Con `host` primero, uno ajeno no le
   * gana a un `host` que si nombra municipio. Invertirlo -como estaba-
   * dejaba que lo eligiera quien mandara la cabecera.
   */
  it("un `x-forwarded-host` ajeno no le gana a un `host` valido", async () => {
    conCabeceras({
      host: "ticul.localhost:3000",
      "x-forwarded-host": "motul.localhost:3000",
    });

    await ayuntamientoActual();

    expect(resolver).toHaveBeenCalledWith("ticul");
    expect(resolver).not.toHaveBeenCalledWith("motul");
  });

  it("la cabecera del proxy gana: con ella el host ni se mira", async () => {
    conCabeceras({
      "x-xula-subdominio": "ticul",
      "x-forwarded-host": "motul.localhost:3000",
    });

    await ayuntamientoActual();

    expect(resolver).toHaveBeenCalledWith("ticul");
  });

  it("un host que no cuelga del dominio base no elige tenant", async () => {
    conCabeceras({ "x-forwarded-host": "ticul.dominio-ajeno.mx" });

    await expect(ayuntamientoActual()).rejects.toBeInstanceOf(
      TenantNoResueltoError,
    );
    expect(resolver).not.toHaveBeenCalled();
  });
});
