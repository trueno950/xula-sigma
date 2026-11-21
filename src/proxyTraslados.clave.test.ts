import { describe, expect, it } from "vitest";
import { CABECERA_AVISO } from "./modules/usuarios/ui/avisoEnTransito";
import {
  CABECERA_CLAVE_MOSTRADA,
  NOMBRE_COOKIE_CLAVE_MOSTRADA,
} from "./modules/usuarios/ui/claveMostradaEnTransito";
import {
  CABECERAS_DE_TRASLADO,
  pideElPayload,
  trasladosDeLaPeticion,
} from "./proxyTraslados";

/**
 * S4 de `usuarios-seguridad`: el payload de la ruta no lleva la contrasenia
 * temporal. Lo que decide es `pideElPayload`, y de eso depende que el proxy
 * consuma o no la cookie de la clave: una navegacion de documento la consume
 * (es el camino sin JavaScript, el unico HTML que ese navegador va a ver) y
 * una peticion del payload no (la clave la entrega el `POST` de la isla).
 *
 * **Las dos formas de pedir el payload cuentan.** El router del cliente manda
 * `rsc: 1` y el destino de un `redirect` de Server Action se pre-renderiza en
 * el servidor con `Accept: text/x-component` y sin `rsc`
 * (`router-reducer/reducers/server-action-reducer.js:162` en Next 16.3.1, «the
 * server pre-fetches the redirect target as RSC»). Si la segunda se colara,
 * la clave volveria al payload que el router guarda y restaura con «Atras».
 */

const TOKEN = "11111111-1111-4111-8111-111111111111";
const OTRO_TOKEN = "33333333-3333-4333-8333-333333333333";

const CLAVE = JSON.stringify({
  token: TOKEN,
  motivo: "alta",
  usuarioId: "22222222-2222-4222-8222-222222222222",
  clave: "clave-temporal-larga",
});

const traslados = (opciones: {
  metodo?: string;
  ruta?: string;
  consulta?: string;
  cookie?: string;
  esPayload?: boolean;
}) =>
  trasladosDeLaPeticion({
    metodo: opciones.metodo ?? "GET",
    ruta: opciones.ruta ?? "/usuarios",
    consulta: new URLSearchParams(opciones.consulta ?? ""),
    leerCookie: () => opciones.cookie,
    esPayload: opciones.esPayload ?? false,
  });

const conClave = (extra: { esPayload?: boolean; consulta?: string } = {}) =>
  traslados({
    consulta: extra.consulta ?? `clave=${TOKEN}`,
    cookie: CLAVE,
    ...(extra.esPayload === undefined ? {} : { esPayload: extra.esPayload }),
  });

describe("pideElPayload", () => {
  it("el router del cliente lo pide con `rsc: 1`", () => {
    expect(pideElPayload(new Headers({ rsc: "1" }))).toBe(true);
  });

  it("el pre-render del destino de un redirect lo pide con `Accept: text/x-component`", () => {
    expect(pideElPayload(new Headers({ accept: "text/x-component" }))).toBe(
      true,
    );
  });

  it("una navegacion de documento pide `text/html`", () => {
    expect(
      pideElPayload(
        new Headers({
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9",
        }),
      ),
    ).toBe(false);
  });

  it("sin cabeceras no es un payload", () => {
    expect(pideElPayload(new Headers())).toBe(false);
  });
});

describe("el traslado de la clave temporal", () => {
  it("una navegacion de documento con el token y su cookie la traslada", () => {
    expect(conClave()).toEqual([
      {
        cabecera: CABECERA_CLAVE_MOSTRADA,
        valor: CLAVE,
        cookie: NOMBRE_COOKIE_CLAVE_MOSTRADA,
        ruta: "/usuarios",
      },
    ]);
  });

  it("el payload de la ruta no la traslada: la pide la isla", () => {
    expect(conClave({ esPayload: true })).toEqual([]);
  });

  it("un token ajeno no la traslada", () => {
    expect(conClave({ consulta: `clave=${OTRO_TOKEN}` })).toEqual([]);
  });

  it("sin token en la URL no hay nada que trasladar", () => {
    expect(conClave({ consulta: "" })).toEqual([]);
  });

  it("una peticion sin la cookie no traslada nada", () => {
    expect(traslados({ consulta: `clave=${TOKEN}` })).toEqual([]);
  });

  it("otra ruta no la consume, ni siquiera con el token", () => {
    expect(traslados({ ruta: "/usuarios/clave-temporal" })).toEqual([]);
    expect(traslados({ consulta: `clave=${TOKEN}`, ruta: "/usuarios/alta" })) //
      .toEqual([]);
  });

  it("un POST no la consume", () => {
    expect(
      traslados({ metodo: "POST", consulta: `clave=${TOKEN}`, cookie: CLAVE }),
    ).toEqual([]);
  });
});

describe("las cabeceras que el proxy borra de la peticion entrante", () => {
  it("incluye la de la clave y la del aviso de la baja", () => {
    expect([...CABECERAS_DE_TRASLADO]).toContain(CABECERA_CLAVE_MOSTRADA);
    expect([...CABECERAS_DE_TRASLADO]).toContain(CABECERA_AVISO);
  });
});
