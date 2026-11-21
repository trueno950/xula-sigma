import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CABECERA_AVISO,
  NOMBRE_COOKIE_AVISO,
  RUTA_COOKIE_AVISO,
} from "./modules/usuarios/ui/avisoEnTransito";
import { NOMBRE_COOKIE_CLAVE_MOSTRADA } from "./modules/usuarios/ui/claveMostradaEnTransito";
import { proxy } from "./proxy";

/**
 * S13 y S14 de `usuarios-ux`: el aviso de la baja nombra a la persona —el
 * nombre lo resuelve la pantalla, la cookie solo lleva el `usuarioId`— y se
 * muestra una sola vez, tambien sin JavaScript y sin importar cuantas veces
 * se recargue o se vuelva con el boton de atras.
 *
 * El unico lugar donde se puede consumir la cookie es el proxy
 * —`cookies().delete` esta acotado a Server Functions y Route Handlers—, y
 * por eso viaja al servidor en una cabecera que el cliente no puede
 * escribir: la que mande se borra antes, igual que la de la clave temporal.
 */

const HOST = "motul.xulasigma.mx";
const TOKEN = "33333333-3333-4333-8333-333333333333";
const VALOR = JSON.stringify({
  token: TOKEN,
  usuarioId: "44444444-4444-4444-8444-444444444444",
});

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
const conLaCookie = (nombre = NOMBRE_COOKIE_AVISO) => ({
  cookie: `${nombre}=${encodeURIComponent(VALOR)}`,
});

const borradoDeLaCookie = (respuesta: Response, nombre = NOMBRE_COOKIE_AVISO) =>
  respuesta.headers
    .getSetCookie()
    .find((cabecera) => cabecera.startsWith(`${nombre}=`));

beforeEach(() => {
  process.env.DOMINIO_BASE = "xulasigma.mx";
});

afterEach(() => {
  process.env.DOMINIO_BASE = undefined;
});

describe("proxy — el aviso de la baja se consume en el servidor", () => {
  it("traslada la cookie a la cabecera y la borra en la misma respuesta", async () => {
    const res = await pedirUsuarios(`?aviso=${TOKEN}&ok=baja`, conLaCookie());

    expect(cabeceraQueRecibeElServidor(res, CABECERA_AVISO)).toBe(VALOR);
    expect(borradoDeLaCookie(res)).toContain(`Path=${RUTA_COOKIE_AVISO}`);
    expect(borradoDeLaCookie(res)).toContain("Expires=Thu, 01 Jan 1970");
  });

  it("sin el token en la URL no traslada nada y deja la cookie", async () => {
    const res = await pedirUsuarios("", conLaCookie());

    expect(cabeceraQueRecibeElServidor(res, CABECERA_AVISO)).toBeNull();
    expect(borradoDeLaCookie(res)).toBeUndefined();
  });

  it("una cabecera inyectada por el cliente no llega al servidor", async () => {
    const res = await pedirUsuarios("", { [CABECERA_AVISO]: VALOR });

    expect(cabeceraQueRecibeElServidor(res, CABECERA_AVISO)).toBeNull();
  });

  it("mandar la cabecera y el token sin la cookie no anuncia nada", async () => {
    const res = await pedirUsuarios(`?aviso=${TOKEN}&ok=baja`, {
      [CABECERA_AVISO]: VALOR,
    });

    expect(cabeceraQueRecibeElServidor(res, CABECERA_AVISO)).toBeNull();
  });

  it("el aviso de la baja no toca la cookie de la clave temporal", async () => {
    const res = await pedirUsuarios(
      `?aviso=${TOKEN}&ok=baja`,
      conLaCookie(NOMBRE_COOKIE_CLAVE_MOSTRADA),
    );

    expect(
      borradoDeLaCookie(res, NOMBRE_COOKIE_CLAVE_MOSTRADA),
    ).toBeUndefined();
  });
});
