import { readFileSync } from "node:fs";
import { join } from "node:path";
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
import {
  comoSuperAdminEn,
  superAdmin,
} from "@/shared/tenancy/superAdminDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { altaDePersona } from "./alta";
import { CLAVE_TEMPORAL_CADUCADA } from "./codigosDeAcceso";
import { hashDeClave } from "./contrasenia";
import { cuentas } from "./esquema";

/**
 * `scripts/restablecer-admin.sql` destraba de verdad al administrador que se
 * quedo afuera.
 *
 * **El caso tipico es una marca ya vencida**: toda cuenta que crea el panel
 * nace con `clave_temporal_en` puesto, asi que el administrador que se
 * bloqueo suele traer la marca de una temporal que vencio. Cambiar solo el
 * hash lo deja igual de afuera —`/sign-in/email` responde 403
 * `CLAVE_TEMPORAL_CADUCADA`— y el script diria que salio bien. Por eso la
 * clave que dicta una operadora se marca como temporal en la **misma
 * sentencia** que escribe el hash: 24 horas y cambio obligatorio, igual que
 * un restablecimiento del panel (`administracionDeUsuarios.ts`).
 *
 * **Corre el bloque del archivo, no una copia.** Se extrae el `DO $$ … $$` del
 * `.sql` real y se ejecuta con `xula_super_admin`, que es el rol con el que
 * corre la operacion: no hay `psql` en este proyecto, asi que lo unico que se
 * reemplaza son las variables de `psql` (`:'correo'`, `:'hash_argon2id'` y
 * `app.tenant`), que el script pasa por `set_config` igual que aca. Si el
 * archivo deja de marcar la temporal, este test se cae.
 */

const CLAVE_DICTADA = "la-que-dicta-la-operadora";
const CLAVE_VIEJA = "la-que-ya-no-sirve";
const CORREO = "admin-destrabado@example.com";
const ORIGEN = `http://${subdominioMotul}.localhost:3000`;
const RUTA_DEL_SCRIPT = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "scripts",
  "restablecer-admin.sql",
);

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

const acceder = (clave: string) => {
  situarseEnMotul();

  return manejarAuth(
    new Request(`${ORIGEN}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: CORREO, password: clave }),
    }),
  );
};

const cuerpoDe = async (respuesta: Response) =>
  (await respuesta.json()) as { code?: string };

/** El `DO $$ … $$` del script, tal cual esta escrito en el archivo. */
const bloqueDelScript = (): string => {
  const texto = readFileSync(RUTA_DEL_SCRIPT, "utf8");
  const desde = texto.indexOf("DO $$");
  const hasta = texto.lastIndexOf("$$;");

  if (desde < 0 || hasta < 0) {
    throw new Error("El script no tiene el bloque DO que este test ejecuta.");
  }

  return texto.slice(desde, hasta + 3);
};

const aplicarElScript = (hash: string) =>
  comoSuperAdminEn(motul, async (tx) => {
    await tx`SELECT set_config('restablecer.correo', ${CORREO}, true)`;
    await tx`SELECT set_config('restablecer.hash', ${hash}, true)`;
    await tx.unsafe(bloqueDelScript());
  });

const marcaDe = (usuarioId: string) =>
  withTenant(motul, (tx) =>
    tx
      .select({ claveTemporalEn: cuentas.claveTemporalEn })
      .from(cuentas)
      .where(eq(cuentas.userId, usuarioId)),
  ).then(([fila]) => fila?.claveTemporalEn ?? null);

let usuarioId = "";

beforeAll(async () => {
  await sembrar();

  usuarioId = await withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre: "Administradora Destrabada",
      email: CORREO,
      clave: CLAVE_VIEJA,
      rol: "ADMIN_MUNICIPAL",
      claveTemporal: true,
    }),
  ).then(({ id }) => id);

  // La marca vencida del caso tipico: el panel la creo asi y nadie entro.
  await withTenant(motul, (tx) =>
    tx
      .update(cuentas)
      .set({ claveTemporalEn: new Date(Date.now() - 25 * 3_600_000) })
      .where(eq(cuentas.userId, usuarioId)),
  );
});

afterAll(async () => {
  await limpiar();
  await superAdmin.end();
  await owner.end();
  await cerrarConexion();
});

describe("el destrabe del ADMIN_MUNICIPAL", () => {
  it("con la marca vencida el administrador esta afuera: es el caso a resolver", async () => {
    const respuesta = await acceder(CLAVE_VIEJA);

    expect(respuesta.status).toBe(403);
    expect((await cuerpoDe(respuesta)).code).toBe(CLAVE_TEMPORAL_CADUCADA);
  });

  it("el script entrega una temporal nueva, y la sesion que abre no opera (S1 y S2)", async () => {
    await aplicarElScript(await hashDeClave(CLAVE_DICTADA));

    const marca = await marcaDe(usuarioId);
    expect(marca).toBeInstanceOf(Date);
    expect(Date.now() - (marca?.getTime() ?? 0)).toBeLessThan(60_000);

    const respuesta = await acceder(CLAVE_DICTADA);
    const cookie = respuesta.headers.get("set-cookie")?.split(";")[0];

    expect(respuesta.status).toBe(200);
    if (!cookie) throw new Error("El acceso no devolvio cookie de sesion.");

    situarseEnMotul(cookie);
    await expect(contextoActual()).resolves.toBeNull();
    expect((await acceder(CLAVE_VIEJA)).status).toBe(401);
  });
});
