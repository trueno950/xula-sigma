import { beforeEach, describe, expect, it, vi } from "vitest";

const manejarAuth = vi.hoisted(() => vi.fn());
const limitarRitmoDeAcceso = vi.hoisted(() => vi.fn());
const ayuntamientoActual = vi.hoisted(() => vi.fn());

vi.mock("@/shared/auth", () => ({ manejarAuth }));
vi.mock("@/shared/auth/limitarRitmo", () => ({ limitarRitmoDeAcceso }));
vi.mock("@/shared/tenancy/contexto", () => ({ ayuntamientoActual }));

const { POST } = await import("./route");
const { RitmoExcedidoError } = await import("@/shared/auth/ritmo");

const TENANT = "11111111-1111-1111-1111-111111111111";

const peticion = (
  ruta: string,
  cuerpo: unknown = { email: "Tesoreria@Example.com", password: "x" },
  cabeceras: Record<string, string> = {},
) =>
  new Request(`http://motul.localhost:3000/api/auth/${ruta}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-xula-superficie": "ayuntamiento",
      ...cabeceras,
    },
    body: JSON.stringify(cuerpo),
  });

describe("limitacion de ritmo en la ruta de auth", () => {
  beforeEach(() => {
    manejarAuth.mockReset();
    limitarRitmoDeAcceso.mockReset();
    ayuntamientoActual.mockReset();

    manejarAuth.mockResolvedValue(Response.json({ ok: true }));
    limitarRitmoDeAcceso.mockResolvedValue(undefined);
    ayuntamientoActual.mockResolvedValue({ id: TENANT });
  });

  it("limita el acceso antes de tocar la instancia", async () => {
    /**
     * El orden es el punto: si `manejarAuth` corriera primero, cada intento
     * frenado igual habria construido la instancia, abierto la transaccion y
     * verificado un hash argon2id. La limitacion dejaria de proteger contra
     * el costo, que es la mitad de para que existe.
     */
    await POST(peticion("sign-in/email"));

    expect(limitarRitmoDeAcceso).toHaveBeenCalledTimes(1);
    expect(manejarAuth).toHaveBeenCalledTimes(1);
    expect(limitarRitmoDeAcceso.mock.invocationCallOrder[0]).toBeLessThan(
      manejarAuth.mock.invocationCallOrder[0] as number,
    );
  });

  it("responde 429 y no llama a la instancia cuando corta", async () => {
    limitarRitmoDeAcceso.mockRejectedValue(new RitmoExcedidoError("correo"));

    const respuesta = await POST(peticion("sign-in/email"));

    expect(respuesta.status).toBe(429);
    expect(manejarAuth).not.toHaveBeenCalled();
  });

  it("no delata cual de las dos ventanas se lleno", async () => {
    /**
     * "Demasiados intentos para este correo" confirma que el correo existe;
     * peor todavia, distingue la ventana de correo de la de IP y le dice a
     * quien prueba cual esquivar. Un solo mensaje para las dos.
     */
    limitarRitmoDeAcceso.mockRejectedValue(new RitmoExcedidoError("correo"));

    const cuerpo = await (await POST(peticion("sign-in/email"))).text();

    expect(cuerpo).not.toContain("correo");
    expect(cuerpo).not.toContain("ip");
  });

  it("no limita el resto del catch-all", async () => {
    // Cerrar sesion o refrescarla no son superficie de fuerza bruta, y
    // limitarlas dejaria a alguien sin poder salir de su propia cuenta.
    await POST(peticion("sign-out", {}));

    expect(limitarRitmoDeAcceso).not.toHaveBeenCalled();
    expect(manejarAuth).toHaveBeenCalledTimes(1);
  });

  it("cuenta por correo normalizado y por IP del proxy", async () => {
    await POST(
      peticion(
        "sign-in/email",
        { email: "  Tesoreria@Example.com  ", password: "x" },
        { "x-forwarded-for": "189.203.10.7, 10.0.0.1" },
      ),
    );

    expect(limitarRitmoDeAcceso).toHaveBeenCalledWith(TENANT, {
      correo: "  Tesoreria@Example.com  ",
      // La primera de la lista es el cliente; las siguientes son los saltos
      // intermedios y las pone el propio proxy.
      ip: "189.203.10.7",
    });
  });

  it("el cuerpo sigue llegando entero a la instancia", async () => {
    /**
     * Leer el cuerpo para sacar el correo lo consume: un `Request` no se
     * lee dos veces. Sin clonarlo, `manejarAuth` recibe un cuerpo vacio y
     * **ningun acceso funciona**.
     */
    await POST(peticion("sign-in/email"));

    const recibida = manejarAuth.mock.calls[0]?.[0] as Request;

    expect(await recibida.json()).toEqual({
      email: "Tesoreria@Example.com",
      password: "x",
    });
  });

  it("un cuerpo sin correo igual gasta ventana de IP", async () => {
    /**
     * Sin esto, mandar `{}` saltea la limitacion entera: ni ventana de
     * correo ni de IP. Bastaba mandar basura para no pagar el intento. Lo
     * encontro la revision de PR 5.
     */
    const respuesta = await POST(peticion("sign-in/email", { nada: true }));

    expect(respuesta.status).not.toBe(500);
    expect(limitarRitmoDeAcceso).toHaveBeenCalledWith(TENANT, {
      correo: null,
      ip: "sin-ip",
    });
  });

  it("un cuerpo que ni siquiera es JSON tambien gasta ventana de IP", async () => {
    const rota = new Request(
      "http://motul.localhost:3000/api/auth/sign-in/email",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-xula-superficie": "ayuntamiento",
        },
        body: "{ esto no es json",
      },
    );

    const respuesta = await POST(rota);

    expect(respuesta.status).not.toBe(500);
    expect(limitarRitmoDeAcceso).toHaveBeenCalledWith(TENANT, {
      correo: null,
      ip: "sin-ip",
    });
  });
});
