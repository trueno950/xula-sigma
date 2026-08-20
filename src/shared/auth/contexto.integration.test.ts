import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CABECERA_SUBDOMINIO } from "@/shared/tenancy/cabeceras";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  subdominioMotul,
  subdominioTicul,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { altaDePersona } from "./alta";

/**
 * `contextoActual()` de punta a punta, sin mockear nada de negocio.
 *
 * Lo unico que se sustituye es `next/headers`, que es el borde del
 * framework. `ayuntamientoActual()` resuelve el subdominio contra la base
 * de verdad y la sesion sale de un acceso real por `manejarAuth`: si el rol
 * no viajara en la sesion firmada, o el subdominio no resolviera, este
 * archivo se cae.
 */

const CORREO = "contexto@example.com";
const CLAVE = "clave-larga-y-buena";

let cabecerasDelRequest = new Headers();

vi.mock("next/headers", () => ({
  headers: async () => cabecerasDelRequest,
}));

const { contextoActual } = await import("./contexto");
const { manejarAuth } = await import("./instancia");

const enMotul = { id: motul, subdominio: subdominioMotul };
const enTicul = { id: ticul, subdominio: subdominioTicul };

type Municipio = typeof enMotul;

const origenDe = (t: Municipio) => `http://${t.subdominio}.localhost:3000`;

/**
 * Deja el request "en curso": el subdominio que escribiria `proxy.ts` y,
 * opcionalmente, la cookie de sesion que devolvio el acceso.
 */
function situarseEn(tenant: Municipio, cookie?: string) {
  cabecerasDelRequest = new Headers({
    host: `${tenant.subdominio}.localhost:3000`,
    [CABECERA_SUBDOMINIO]: tenant.subdominio,
    ...(cookie ? { cookie } : {}),
  });
}

async function acceder(tenant: Municipio) {
  situarseEn(tenant);

  const respuesta = await manejarAuth(
    new Request(`${origenDe(tenant)}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: CORREO, password: CLAVE }),
    }),
  );

  expect(respuesta.status).toBe(200);

  const cookie = respuesta.headers.get("set-cookie");

  if (!cookie) throw new Error("El acceso no devolvio cookie de sesion.");

  return cookie.split(";")[0] as string;
}

beforeAll(async () => {
  await sembrar();

  await withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre: "Quien Administra",
      email: CORREO,
      clave: CLAVE,
      rol: "ADMIN_MUNICIPAL",
    }),
  );

  await withTenant(ticul, (tx) =>
    altaDePersona(tx, ticul, {
      nombre: "Quien Consulta",
      email: CORREO,
      clave: CLAVE,
      rol: "CONSULTA",
    }),
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("contextoActual", () => {
  it("sin sesion no hay contexto", async () => {
    situarseEn(enMotul);

    expect(await contextoActual()).toBeNull();
  });

  it("devuelve el ayuntamiento del subdominio y el rol de la sesion", async () => {
    const cookie = await acceder(enMotul);
    situarseEn(enMotul, cookie);

    const contexto = await contextoActual();

    expect(contexto?.ayuntamientoId).toBe(motul);
    expect(contexto?.usuario.rol).toBe("ADMIN_MUNICIPAL");
  });

  it("trae el origen de la peticion, que es el 'desde donde' de la bitacora", async () => {
    /**
     * El origen viaja en el contexto y no lo arma cada caso de uso. Es lo
     * que hace que la columna `origen` se llene sola: quien registra una
     * traza ya tiene el contexto en la mano, asi que no hay un dato mas
     * que acordarse de pasar.
     */
    const cookie = await acceder(enMotul);
    situarseEn(enMotul, cookie);

    const contexto = await contextoActual();

    expect(contexto?.origen).toBe(origenDe(enMotul));
  });

  it("el rol sale de la sesion, no de un valor por defecto", async () => {
    /**
     * Control positivo del anterior. Con un solo municipio, un
     * `contextoActual` que devolviera siempre `"ADMIN_MUNICIPAL"` —o el
     * primer rol de `ROLES`— pasaria igual.
     */
    const cookie = await acceder(enTicul);
    situarseEn(enTicul, cookie);

    const contexto = await contextoActual();

    expect(contexto?.ayuntamientoId).toBe(ticul);
    expect(contexto?.usuario.rol).toBe("CONSULTA");
  });

  it("la cookie de un municipio no abre contexto en el otro", async () => {
    /**
     * La cookie va acotada al subdominio y no deberia ni llegar, pero eso
     * lo garantiza el navegador. Aca se manda a mano: lo que tiene que
     * frenarla es el servidor.
     */
    const cookie = await acceder(enTicul);
    situarseEn(enMotul, cookie);

    expect(await contextoActual()).toBeNull();
  });
});
