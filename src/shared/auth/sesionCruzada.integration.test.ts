import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
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
 * La sesion esta atada a su municipio por RLS, no por el alcance de la
 * cookie.
 *
 * `conAuth` abre `withTenant` con el tenant que resolvio el servidor y
 * Better Auth busca la sesion adentro de esa transaccion. Apuntar a otro
 * municipio mueve tambien esa busqueda, y la fila propia de `sesiones`
 * deja de verse: quien llegue con una sesion de Motul y un contexto de
 * Ticul no lee nada, ni siquiera lo suyo.
 *
 * Es una reja por si sola y no la defensa de ningun atajo. Nacio
 * justificando un respaldo que derivaba el tenant de las cabeceras de
 * host; ese respaldo se fue a `proxy.ts` y esto quedo igual de valido,
 * porque no dependia de el.
 *
 * Vive aparte de `accesoCruzado.integration.test.ts` porque es otro tema:
 * alla se prueba contra que persona resuelve el acceso, aca que alcanza a
 * leer una sesion ya emitida.
 */

const CORREO = "sesion@example.com";
const CLAVE = "clave-larga-y-buena";

/** El tenant que `manejarAuth` va a resolver en la proxima llamada. */
let tenantDelRequest: { id: AyuntamientoId; subdominio: string };

vi.mock("@/shared/tenancy/contexto", () => ({
  ayuntamientoActual: async () => tenantDelRequest,
}));

const { manejarAuth } = await import("./instancia");

const enMotul = { id: motul, subdominio: subdominioMotul };
const enTicul = { id: ticul, subdominio: subdominioTicul };

type Municipio = typeof enMotul;

const url = (tenant: Municipio, ruta: string) =>
  `http://${tenant.subdominio}.localhost:3000/api/auth/${ruta}`;

beforeAll(async () => {
  await sembrar();
  await withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre: "Persona de Motul",
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

describe("una sesion emitida en un municipio", () => {
  /**
   * Se usa la cookie real que emitio el acceso, no una armada a mano: el
   * token que viaja es el mismo que la libreria firmo.
   */
  it("no se lee desde otro municipio", async () => {
    tenantDelRequest = enMotul;
    const acceso = await manejarAuth(
      new Request(url(enMotul, "sign-in/email"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: CORREO, password: CLAVE }),
      }),
    );

    const cookie = acceso.headers.get("set-cookie");
    expect(cookie).toBeTruthy();

    const sesionDesde = async (tenant: Municipio) => {
      tenantDelRequest = tenant;
      const leida = await manejarAuth(
        new Request(url(tenant, "get-session"), {
          headers: { cookie: cookie as string },
        }),
      );
      return (await leida.json()) as { user?: { id: string } } | null;
    };

    // Sin esta primera asercion el test pasaria aunque la cookie no
    // sirviera para nada: "no hay sesion en Ticul" seria cierto por el
    // motivo equivocado.
    expect((await sesionDesde(enMotul))?.user?.id).toBeTruthy();
    expect((await sesionDesde(enTicul))?.user).toBeFalsy();
  });
});
