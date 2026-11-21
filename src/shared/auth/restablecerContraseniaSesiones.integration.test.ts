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
import { restablecerContrasenia } from "./administracionDeUsuarios";
import { sesiones } from "./esquema";
import {
  CLAVE_DE_LA_PERSONA,
  contextoDeActor,
  TEMPORAL_NUEVA,
  unaPersona,
} from "./reactivacionDePrueba";

/**
 * Un restablecimiento cierra las sesiones de la persona, no solo le cambia
 * la clave.
 *
 * **Lo que cierra el agujero:** la sesion que la persona ya tenia abierta
 * sobrevive al cambio de hash, entra a la pantalla de cambio obligatorio
 * —que solo pide la clave nueva, dos veces— y desde ahi pone una clave
 * propia sin conocer ninguna. Una cookie robada se vuelve la cuenta entera.
 * El caso de uso borra las sesiones en la misma transaccion que escribe el
 * hash, igual que la reactivacion y la baja; una sesion abierta antes del
 * restablecimiento tiene que dejar de resolver contexto.
 *
 * Corre por `manejarAuth` y `contextoActual`, los caminos reales del
 * request, con `next/headers` sustituido —el borde del framework—. Vive
 * aparte de `restablecerContrasenia.integration.test.ts` porque necesita esa
 * sustitucion.
 */

const ORIGEN = `http://${subdominioMotul}.localhost:3000`;

let cabecerasDelRequest = new Headers();

vi.mock("next/headers", () => ({ headers: async () => cabecerasDelRequest }));

const { contextoActual } = await import("./contexto");
const { manejarAuth } = await import("./instancia");

const situarseEnMotul = (cookie?: string) => {
  cabecerasDelRequest = new Headers({
    host: `${subdominioMotul}.localhost:3000`,
    [CABECERA_SUBDOMINIO]: subdominioMotul,
    ...(cookie ? { cookie } : {}),
  });
};

const acceder = (email: string, clave: string) => {
  situarseEnMotul();

  return manejarAuth(
    new Request(`${ORIGEN}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: clave }),
    }),
  );
};

const sesionesDe = (usuarioId: string) =>
  withTenant(motul, (tx) =>
    tx
      .select({ id: sesiones.id })
      .from(sesiones)
      .where(eq(sesiones.userId, usuarioId)),
  );

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("restablecer la clave de otra persona", () => {
  it("cierra la sesion que la persona tenia abierta antes del cambio", async () => {
    const { id, email } = await unaPersona();
    const respuesta = await acceder(email, CLAVE_DE_LA_PERSONA);
    const cookie = respuesta.headers.get("set-cookie")?.split(";")[0];

    expect(respuesta.status).toBe(200);
    if (!cookie) throw new Error("El acceso no devolvio cookie de sesion.");

    situarseEnMotul(cookie);
    // Control positivo: sin esto, un `contextoActual` roto pasaria el test.
    await expect(contextoActual()).resolves.not.toBeNull();

    await restablecerContrasenia(contextoDeActor(motul, "ADMIN_MUNICIPAL"), {
      usuarioId: id,
      nuevaClave: TEMPORAL_NUEVA,
    });

    situarseEnMotul(cookie);
    await expect(contextoActual()).resolves.toBeNull();
    await expect(sesionesDe(id)).resolves.toHaveLength(0);

    // Y la clave nueva si abre: el restablecimiento ocurrio.
    expect((await acceder(email, TEMPORAL_NUEVA)).status).toBe(200);
  });
});
