import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CABECERA_CLAVE_MOSTRADA,
  NOMBRE_COOKIE_CLAVE_MOSTRADA,
} from "./modules/usuarios/ui/claveMostradaEnTransito";
import { proxy } from "./proxy";

/**
 * S2: la contrasenia temporal se muestra una sola vez tambien sin
 * JavaScript.
 *
 * El unico lugar donde se puede consumir la cookie es el proxy —
 * `cookies().delete` esta acotado a Server Functions y Route Handlers—, y
 * por eso viaja al servidor en una cabecera que el cliente no puede
 * escribir. Vive en su propio archivo y no en `proxy.test.ts` para que ese
 * siga por debajo de las 200 lineas que pide `AGENTS.md`.
 */

const HOST = "motul.xulasigma.mx";
const TOKEN = "11111111-1111-4111-8111-111111111111";
const VALOR = JSON.stringify({
  token: TOKEN,
  motivo: "alta",
  usuarioId: "22222222-2222-4222-8222-222222222222",
  clave: "clave-temporal-larga",
});

/** `NextResponse.next` publica las cabeceras que vera el servidor aca. */
const cabeceraQueRecibeElServidor = (
  respuesta: Response,
  nombre: string,
): string | null => respuesta.headers.get(`x-middleware-request-${nombre}`);

const pedirUsuarios = (
  consulta: string,
  cabecerasDelCliente: Record<string, string> = {},
) =>
  proxy(
    new NextRequest(`https://${HOST}/usuarios${consulta}`, {
      headers: { host: HOST, ...cabecerasDelCliente },
    }),
  );

/** El navegador manda la cookie codificada: `cookies().set` la codifica. */
const conLaCookie = () => ({
  cookie: `${NOMBRE_COOKIE_CLAVE_MOSTRADA}=${encodeURIComponent(VALOR)}`,
});

const borradoDeLaCookie = (respuesta: Response) =>
  respuesta.headers
    .getSetCookie()
    .find((cabecera) =>
      cabecera.startsWith(`${NOMBRE_COOKIE_CLAVE_MOSTRADA}=`),
    );

beforeEach(() => {
  process.env.DOMINIO_BASE = "xulasigma.mx";
});

afterEach(() => {
  process.env.DOMINIO_BASE = undefined;
});

describe("proxy — la clave temporal se consume en el servidor", () => {
  it("traslada la cookie a la cabecera y la borra en la misma respuesta", async () => {
    const res = await pedirUsuarios(`?clave=${TOKEN}`, conLaCookie());

    expect(cabeceraQueRecibeElServidor(res, CABECERA_CLAVE_MOSTRADA)).toBe(
      VALOR,
    );
    // `Path` es el de la cookie: un borrado con otro `Path` no la borra.
    expect(borradoDeLaCookie(res)).toContain("Path=/usuarios");
    expect(borradoDeLaCookie(res)).toContain("Expires=Thu, 01 Jan 1970");
  });

  /**
   * S4 de `usuarios-seguridad`: el payload que el router guarda y restaura al
   * volver con «Atras» no puede llevar la contrasenia, asi que en la peticion
   * del router la cookie no se consume. La pide la isla en un `POST` que la
   * entrega y la borra en el mismo viaje.
   */
  it("el payload del router no lleva la clave ni consume la cookie", async () => {
    const res = await pedirUsuarios(`?clave=${TOKEN}`, {
      ...conLaCookie(),
      rsc: "1",
    });

    expect(
      cabeceraQueRecibeElServidor(res, CABECERA_CLAVE_MOSTRADA),
    ).toBeNull();
    expect(borradoDeLaCookie(res)).toBeUndefined();
  });

  /**
   * El destino de un `redirect` de Server Action se pre-renderiza en el
   * servidor pidiendo el payload (`Accept: text/x-component`, sin `rsc`), y
   * ese payload es el que el router guarda: tampoco puede llevar la clave.
   */
  it("el pre-render del destino de un redirect tampoco la lleva", async () => {
    const res = await pedirUsuarios(`?clave=${TOKEN}`, {
      ...conLaCookie(),
      accept: "text/x-component",
    });

    expect(
      cabeceraQueRecibeElServidor(res, CABECERA_CLAVE_MOSTRADA),
    ).toBeNull();
    expect(borradoDeLaCookie(res)).toBeUndefined();
  });

  it("una navegacion de documento si la traslada: es el camino sin JavaScript", async () => {
    const res = await pedirUsuarios(`?clave=${TOKEN}`, {
      ...conLaCookie(),
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    });

    expect(cabeceraQueRecibeElServidor(res, CABECERA_CLAVE_MOSTRADA)).toBe(
      VALOR,
    );
    expect(borradoDeLaCookie(res)).toContain("Path=/usuarios");
  });

  it("sin el token en la URL no traslada nada y deja la cookie", async () => {
    const res = await pedirUsuarios("", conLaCookie());

    expect(
      cabeceraQueRecibeElServidor(res, CABECERA_CLAVE_MOSTRADA),
    ).toBeNull();
    expect(borradoDeLaCookie(res)).toBeUndefined();
  });

  it("una cabecera inyectada por el cliente no llega al servidor", async () => {
    const res = await pedirUsuarios("", { [CABECERA_CLAVE_MOSTRADA]: VALOR });

    expect(
      cabeceraQueRecibeElServidor(res, CABECERA_CLAVE_MOSTRADA),
    ).toBeNull();
  });

  it("mandar la cabecera y el token sin la cookie no muestra ninguna clave", async () => {
    const res = await pedirUsuarios(`?clave=${TOKEN}`, {
      [CABECERA_CLAVE_MOSTRADA]: VALOR,
    });

    expect(
      cabeceraQueRecibeElServidor(res, CABECERA_CLAVE_MOSTRADA),
    ).toBeNull();
  });
});
