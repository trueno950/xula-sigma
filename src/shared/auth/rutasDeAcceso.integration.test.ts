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
 * La superficie de acceso de `/api/auth/*`: que rutas contestan, con que forma
 * y cual abre sesion.
 *
 * **Una sola puerta adivinable.** `/sign-in/email` es la unica ruta que abre
 * sesion con correo y clave, y es la que limita `limitarRitmoDeAcceso` antes
 * de construir la instancia. Dos cosas mas afirman eso: las variantes de la
 * ruta canonica —barra final, barra doble, `%65`— no son la ruta, y todo lo
 * que la libreria trae de autoservicio —alta, alta social, OTP, acceso
 * anonimo, envio de correo— esta cerrado por configuracion
 * (`configuracion.ts`). Si una variante contestara con `set-cookie`, el
 * limitador quedaria esquivado sin tocar una linea de codigo.
 *
 * **Con una clave temporal puesta** (S2), las dos rutas que la libreria
 * apagaria por su cuenta quedan en 404: `/change-password` porque escribe el
 * hash sin bitacora, y `/verify-password` porque es un oraculo de la clave
 * sin limite propio. Lo que esas dos rutas no deben hacer con la fila —ni con
 * la de `/update-user` ni con `/delete-user`— lo mide
 * `autoservicioRutas.integration.test.ts`; aca el sujeto es la superficie.
 *
 * Se corre por `manejarAuth`, que es el handler real de `/api/auth/*`.
 */

const CLAVE = "clave-larga-y-buena";
const CLAVE_NUEVA = "otra-clave-larga-y-nueva";
const CORREO = "rutas-de-acceso@example.com";
const ORIGEN = `http://${subdominioMotul}.localhost:3000`;

let cabecerasDelRequest = new Headers();

vi.mock("next/headers", () => ({ headers: async () => cabecerasDelRequest }));

const { manejarAuth } = await import("./instancia");

const situarseEnMotul = () => {
  cabecerasDelRequest = new Headers({
    host: `${subdominioMotul}.localhost:3000`,
    [CABECERA_SUBDOMINIO]: subdominioMotul,
  });
};

const pedir = (peticion: {
  metodo: string;
  ruta: string;
  cookie?: string | undefined;
  cuerpo?: unknown;
}) =>
  manejarAuth(
    new Request(`${ORIGEN}/api/auth/${peticion.ruta}`, {
      method: peticion.metodo,
      headers: {
        ...(peticion.cookie ? { cookie: peticion.cookie } : {}),
        ...(peticion.cuerpo === undefined
          ? {}
          : { "content-type": "application/json" }),
      },
      ...(peticion.cuerpo === undefined
        ? {}
        : { body: JSON.stringify(peticion.cuerpo) }),
    }),
  );

const acceder = async (clave = CLAVE): Promise<string> => {
  situarseEnMotul();

  const respuesta = await pedir({
    metodo: "POST",
    ruta: "sign-in/email",
    cuerpo: { email: CORREO, password: clave },
  });
  const cookie = respuesta.headers.get("set-cookie")?.split(";")[0];

  expect(respuesta.status).toBe(200);
  if (!cookie) throw new Error("El acceso no devolvio cookie de sesion.");

  return cookie;
};

const VARIANTES = ["sign-in/email/", "sign-in//email", "sign-in/%65mail"];

const RUTAS_CERRADAS: [string, string, unknown][] = [
  ["POST", "sign-up/email", { email: "nadie@example.com", password: CLAVE }],
  ["POST", "sign-in/social", { provider: "google" }],
  ["POST", "sign-in/otp", { email: CORREO }],
  ["POST", "sign-in/anonymous", {}],
  ["POST", "request-password-reset", { email: CORREO }],
];

const APAGADAS: [string, Record<string, string>][] = [
  ["change-password", { currentPassword: CLAVE, newPassword: CLAVE_NUEVA }],
  ["verify-password", { password: CLAVE }],
];

beforeAll(async () => {
  await sembrar();
  await withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre: "Persona Con Temporal",
      email: CORREO,
      clave: CLAVE,
      rol: "OPERADOR",
      claveTemporal: true,
    }),
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("la superficie del acceso", () => {
  it("la ruta canonica abre sesion", async () => {
    await expect(acceder()).resolves.toContain("session");
  });

  it.each(VARIANTES)("/%s no es la ruta y no abre sesion", async (ruta) => {
    const respuesta = await pedir({
      metodo: "POST",
      ruta,
      cuerpo: { email: CORREO, password: CLAVE },
    });

    expect(respuesta.status).toBe(404);
    expect(respuesta.headers.get("set-cookie")).toBeNull();
  });

  it.each(RUTAS_CERRADAS)(
    "%s /%s responde 4xx y no abre sesion",
    async (metodo, ruta, cuerpo) => {
      const respuesta = await pedir({ metodo, ruta, cuerpo });

      expect(respuesta.status).toBeGreaterThanOrEqual(400);
      expect(respuesta.status).toBeLessThan(500);
      expect(respuesta.headers.get("set-cookie")).toBeNull();
    },
  );
});

describe("con una sesion abierta con la clave temporal puesta", () => {
  it.each(APAGADAS)(
    "/%s esta apagado para todo el mundo",
    async (ruta, cuerpo) => {
      const respuesta = await pedir({
        metodo: "POST",
        ruta,
        cookie: await acceder(),
        cuerpo,
      });

      expect(respuesta.status).toBe(404);
    },
  );
});
