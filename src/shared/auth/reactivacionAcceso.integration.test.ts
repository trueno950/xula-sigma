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
import { CLAVE_TEMPORAL_CADUCADA } from "./codigosDeAcceso";
import { cuentas, sesiones } from "./esquema";
import {
  CLAVE_DE_LA_PERSONA,
  contextoDeActor,
  darDeBaja,
  TEMPORAL_NUEVA,
  unaPersona,
} from "./reactivacionDePrueba";
import { reactivarUsuario } from "./reactivacionDeUsuario";

/**
 * S1 y S2 del lado del acceso, sobre la temporal que emite una reactivacion
 * (S3): entra —es la clave que la operadora acaba de dictar—, pero la sesion
 * que abre no resuelve contexto de panel, y a las 24 horas deja de entrar y
 * no crea sesion.
 *
 * Corre por `manejarAuth` y `contextoActual`, los caminos reales del request:
 * si el gancho de sesion o el contexto dejaran de mirar la marca, este
 * archivo se cae. Vive aparte de `reactivacionDeUsuario.integration.test.ts`
 * porque necesita sustituir `next/headers`, que es el borde del framework.
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
    tx.select().from(sesiones).where(eq(sesiones.userId, usuarioId)),
  );

const reactivar = (usuarioId: string) =>
  reactivarUsuario(contextoDeActor(motul, "ADMIN_MUNICIPAL"), {
    usuarioId,
    nuevaClave: TEMPORAL_NUEVA,
  });

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("la temporal que emite la reactivacion", () => {
  it("entra, pero la sesion no resuelve contexto de panel (S2)", async () => {
    const { id, email } = await unaPersona();

    await darDeBaja(motul, id);
    await reactivar(id);

    const respuesta = await acceder(email, TEMPORAL_NUEVA);
    const cookie = respuesta.headers.get("set-cookie")?.split(";")[0];

    expect(respuesta.status).toBe(200);
    if (!cookie) throw new Error("El acceso no devolvio cookie de sesion.");

    situarseEnMotul(cookie);

    // S2: hay sesion, pero `contextoActual()` no autoriza ninguna operacion.
    await expect(contextoActual()).resolves.toBeNull();
    // Y la clave que tenia antes de la baja ya no abre nada.
    expect((await acceder(email, CLAVE_DE_LA_PERSONA)).status).toBe(401);
  });

  it("caduca a las 24 horas y no abre sesion (S1)", async () => {
    const { id, email } = await unaPersona();

    await darDeBaja(motul, id);
    await reactivar(id);
    await withTenant(motul, (tx) =>
      tx
        .update(cuentas)
        .set({ claveTemporalEn: new Date(Date.now() - 25 * 3_600_000) })
        .where(eq(cuentas.userId, id)),
    );

    const respuesta = await acceder(email, TEMPORAL_NUEVA);
    const cuerpo = (await respuesta.json()) as { code?: string };

    expect(respuesta.status).toBe(403);
    expect(cuerpo.code).toBe(CLAVE_TEMPORAL_CADUCADA);
    await expect(sesionesDe(id)).resolves.toHaveLength(0);
  });
});
