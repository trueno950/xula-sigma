import { describe, expect, it } from "vitest";
import {
  CABECERA_AVISO,
  NOMBRE_COOKIE_AVISO,
  RUTA_COOKIE_AVISO,
} from "./modules/usuarios/ui/avisoEnTransito";
import {
  CABECERA_CLAVE_MOSTRADA,
  NOMBRE_COOKIE_CLAVE_MOSTRADA,
  RUTA_COOKIE_CLAVE_MOSTRADA,
} from "./modules/usuarios/ui/claveMostradaEnTransito";
import { CABECERAS_DE_TRASLADO, trasladosDeLaPeticion } from "./proxyTraslados";

/**
 * Lo que el proxy consume en cada respuesta, en un solo lugar: la clave
 * temporal (S2 de `usuarios-ux`) y el aviso de la baja (S13 y S14). Vive
 * fuera de `proxy.ts` porque ese archivo esta en el limite de 200 lineas que
 * pide `AGENTS.md`.
 *
 * La lista de cabeceras es la que el proxy borra de la peticion antes de
 * escribir las suyas: sin eso, cualquiera inyectaria una clave o un aviso en
 * la pantalla de su municipio con una cabecera y un token inventados.
 */

const TOKEN_CLAVE = "11111111-1111-4111-8111-111111111111";
const TOKEN_AVISO = "33333333-3333-4333-8333-333333333333";

const COOKIE_CLAVE = JSON.stringify({
  token: TOKEN_CLAVE,
  motivo: "alta",
  usuarioId: "22222222-2222-4222-8222-222222222222",
  clave: "clave-temporal-larga",
});

const COOKIE_AVISO = JSON.stringify({
  token: TOKEN_AVISO,
  usuarioId: "44444444-4444-4444-8444-444444444444",
});

const traslados = ({
  metodo = "GET",
  ruta = RUTA_COOKIE_CLAVE_MOSTRADA,
  consulta = "",
  claves,
}: {
  metodo?: string;
  ruta?: string;
  consulta?: string;
  claves?: Record<string, string>;
}) =>
  trasladosDeLaPeticion({
    metodo,
    ruta,
    consulta: new URLSearchParams(consulta),
    leerCookie: (nombre) => claves?.[nombre],
  });

describe("trasladosDeLaPeticion", () => {
  it("las dos cabeceras que escribe el proxy se borran de la peticion", () => {
    expect([...CABECERAS_DE_TRASLADO]).toEqual([
      CABECERA_CLAVE_MOSTRADA,
      CABECERA_AVISO,
    ]);
  });

  it("la clave temporal se traslada igual que antes del aviso", () => {
    expect(
      traslados({
        consulta: `clave=${TOKEN_CLAVE}`,
        claves: { [NOMBRE_COOKIE_CLAVE_MOSTRADA]: COOKIE_CLAVE },
      }),
    ).toEqual([
      {
        cabecera: CABECERA_CLAVE_MOSTRADA,
        valor: COOKIE_CLAVE,
        cookie: NOMBRE_COOKIE_CLAVE_MOSTRADA,
        ruta: RUTA_COOKIE_CLAVE_MOSTRADA,
      },
    ]);
  });

  it("el aviso de la baja se traslada con su propio token", () => {
    expect(
      traslados({
        ruta: RUTA_COOKIE_AVISO,
        consulta: `aviso=${TOKEN_AVISO}&ok=baja`,
        claves: { [NOMBRE_COOKIE_AVISO]: COOKIE_AVISO },
      }),
    ).toEqual([
      {
        cabecera: CABECERA_AVISO,
        valor: COOKIE_AVISO,
        cookie: NOMBRE_COOKIE_AVISO,
        ruta: RUTA_COOKIE_AVISO,
      },
    ]);
  });

  it("una peticion sin tokens no consume ninguna cookie", () => {
    expect(
      traslados({
        claves: {
          [NOMBRE_COOKIE_CLAVE_MOSTRADA]: COOKIE_CLAVE,
          [NOMBRE_COOKIE_AVISO]: COOKIE_AVISO,
        },
      }),
    ).toEqual([]);
  });
});
