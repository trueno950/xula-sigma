import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CABECERA_SUBDOMINIO } from "@/shared/tenancy/cabeceras";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  subdominioMotul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { altaDePersona } from "./alta";

/**
 * El limitador de ritmo **de Better Auth** esta apagado (`configuracion.ts`,
 * `RITMO_DE_BETTER_AUTH`), y el del municipio sigue siendo el nuestro.
 *
 * Cuatro accesos seguidos del mismo correo tienen que entrar. Con la libreria
 * limitando —3 cada 10 segundos por `ip|ruta`, `api/rate-limiter/index.mjs:
 * 370-376` en 1.6.29— el cuarto responde 429 con
 * `{"message":"Too many requests…"}`: eso es lo que veia el E2E al repetir un
 * caso, y lo que veria un ayuntamiento entero detras del proxy cuando la IP no
 * se puede resolver y la llave pasa a ser una sola compartida por proceso.
 *
 * Aca se prueba por `manejarAuth`, que es el handler real. La ventana nuestra
 * no se puede provocar por este camino —`limitarRitmoDeAcceso` vive en el
 * Route Handler, no en el handler de la libreria— y su prueba es
 * `ritmoDeLaRuta.test.ts`; lo que este archivo afirma es que **la de la
 * libreria no compite**.
 */

const CLAVE = "clave-larga-y-buena";
const CORREO = "ritmo-de-la-libreria@example.com";
const ORIGEN = `http://${subdominioMotul}.localhost:3000`;
const ACCESOS_SEGUIDOS = 4;

let cabecerasDelRequest = new Headers();

vi.mock("next/headers", () => ({ headers: async () => cabecerasDelRequest }));

const { manejarAuth } = await import("./instancia");

const acceder = () => {
  // Sin `x-forwarded-for` a proposito: es el caso en que la libreria no puede
  // resolver la IP y cae en un unico bucket compartido. Si su limitador
  // estuviera prendido, el cuarto acceso seria el 429.
  cabecerasDelRequest = new Headers({
    host: `${subdominioMotul}.localhost:3000`,
    [CABECERA_SUBDOMINIO]: subdominioMotul,
  });

  return manejarAuth(
    new Request(`${ORIGEN}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: CORREO, password: CLAVE }),
    }),
  );
};

beforeAll(async () => {
  await sembrar();
  await withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre: "Persona Del Ritmo",
      email: CORREO,
      clave: CLAVE,
      rol: "OPERADOR",
    }),
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("el limitador de la libreria", () => {
  it(`${ACCESOS_SEGUIDOS} accesos seguidos entran: no hay 3 cada 10 segundos`, async () => {
    for (let intento = 1; intento <= ACCESOS_SEGUIDOS; intento += 1) {
      const respuesta = await acceder();

      expect(respuesta.status).toBe(200);
      expect(await respuesta.text()).not.toContain("Too many requests");
    }
  });
});
