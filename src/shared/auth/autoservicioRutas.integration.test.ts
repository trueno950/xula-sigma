import { eq } from "drizzle-orm";
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
import { verificarClave } from "./contrasenia";
import { cuentas, usuarios } from "./esquema";

/**
 * S2 en las rutas de Better Auth, una por una: con la clave temporal puesta,
 * **ninguna** reescribe la credencial ni el perfil de la persona.
 *
 * Es la otra mitad de `autoservicio.integration.test.ts`. Ese archivo prueba
 * los dos caminos que la libreria sirve de verdad —`/change-password` apagado
 * y `/update-user` rechazado para las cuentas marcadas— y este recorre las
 * demas rutas de autoservicio con la misma vara: la barra final, el metodo
 * equivocado y los endpoints que hoy no son alcanzables (`/set-password` es
 * `serverOnly`, `/reset-password` y `/change-email` piden envio de correo,
 * `/delete-user` esta deshabilitado) quedan afirmados como inofensivos, y no
 * como supuestos. El dia que alguien configure el envio de correo o habilite
 * la baja propia, esto ya lo esta mirando.
 *
 * "Inofensivo" se mide en la fila, no en el status: por eso se comparan el
 * hash, la marca, el nombre y el rol despues de cada peticion.
 */

const CLAVE = "clave-larga-y-buena";
const CLAVE_NUEVA = "otra-clave-larga-y-nueva";
const CORREO = "autoservicio-rutas@example.com";
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

const acceder = async (): Promise<string> => {
  situarseEnMotul();

  const respuesta = await manejarAuth(
    new Request(`${ORIGEN}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: CORREO, password: CLAVE }),
    }),
  );
  const cookie = respuesta.headers.get("set-cookie")?.split(";")[0];

  expect(respuesta.status).toBe(200);
  if (!cookie) throw new Error("El acceso no devolvio cookie de sesion.");

  return cookie;
};

const estadoDe = async () =>
  withTenant(motul, async (tx) => {
    const [persona] = await tx
      .select({
        id: usuarios.id,
        name: usuarios.name,
        rol: usuarios.rol,
        password: cuentas.password,
        claveTemporalEn: cuentas.claveTemporalEn,
      })
      .from(usuarios)
      .innerJoin(cuentas, eq(cuentas.userId, usuarios.id))
      .where(eq(usuarios.email, CORREO));

    return persona;
  });

const llamar = (peticion: {
  metodo: string;
  ruta: string;
  cookie: string;
  cuerpo?: Record<string, string> | undefined;
}) =>
  manejarAuth(
    new Request(`${ORIGEN}/api/auth/${peticion.ruta}`, {
      method: peticion.metodo,
      headers: {
        cookie: peticion.cookie,
        ...(peticion.cuerpo ? { "content-type": "application/json" } : {}),
      },
      ...(peticion.cuerpo ? { body: JSON.stringify(peticion.cuerpo) } : {}),
    }),
  );

const CASOS: [string, string, Record<string, string> | undefined][] = [
  [
    "POST",
    "change-password/",
    { currentPassword: CLAVE, newPassword: CLAVE_NUEVA },
  ],
  ["GET", "change-password", undefined],
  ["POST", "set-password", { newPassword: CLAVE_NUEVA }],
  ["POST", "reset-password", { newPassword: CLAVE_NUEVA, token: "inventado" }],
  ["POST", "change-email", { newEmail: "otro@example.com" }],
  ["POST", "delete-user", { password: CLAVE }],
  ["POST", "link-social", { provider: "google", callbackURL: "/" }],
  ["POST", "update-user/", { name: "Nombre Ajeno" }],
];

let cookie = "";

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
  cookie = await acceder();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("las rutas de autoservicio con una clave temporal puesta", () => {
  it.each(CASOS)(
    "%s /%s no responde 200 y no cambia ni la credencial ni el perfil",
    async (metodo, ruta, cuerpo) => {
      const antes = await estadoDe();

      const respuesta = await llamar({ metodo, ruta, cookie, cuerpo });

      expect(respuesta.status).not.toBe(200);
      const despues = await estadoDe();

      expect(despues).toEqual(antes);
      // El hash se compara aparte para que el fallo diga cual se rompio.
      expect(despues?.password).toBe(antes?.password);
      expect(await verificarClave(despues?.password ?? "", CLAVE)).toBe(true);
      expect(await verificarClave(despues?.password ?? "", CLAVE_NUEVA)).toBe(
        false,
      );
      expect(despues?.claveTemporalEn).toEqual(antes?.claveTemporalEn);
      expect(despues?.name).toBe("Persona Con Temporal");
      expect(despues?.rol).toBe("OPERADOR");
    },
  );
});
