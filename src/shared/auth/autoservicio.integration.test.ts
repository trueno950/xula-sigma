import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CABECERA_SUBDOMINIO } from "@/shared/tenancy/cabeceras";
import { bitacora } from "@/shared/tenancy/esquema";
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
 * S2 del seguimiento de L4: una sesion abierta con la clave temporal no
 * reescribe su propia credencial por el autoservicio de Better Auth, y
 * ninguna sesion cambia la clave por ahi —el unico camino es
 * `/cambiar-contrasenia`—.
 *
 * Eran dos huecos distintos del mismo borde. `POST /api/auth/change-password`
 * cambiaba el hash y dejaba la marca puesta: la persona seguia obligada a
 * cambiarla, con una clave que ya no era la que se le dicto, y sin una linea
 * de bitacora. Se apaga la ruta entera (`disabledPaths`, ver
 * `configuracion.ts`). `POST /api/auth/update-user` escribe el perfil de la
 * persona, y lo unico que la temporal autoriza es cambiar la clave: se
 * rechaza solo para las cuentas marcadas (`autoservicio.ts`).
 *
 * Se corre por `manejarAuth`, que es el handler real de `/api/auth/*`, y se
 * mira la fila ademas del status: un 404 puede deberse a otra cosa.
 */

const CLAVE = "clave-larga-y-buena";
const CLAVE_NUEVA = "otra-clave-larga-y-nueva";
const CORREO_MARCADA = "autoservicio-temporal@example.com";
const CORREO_PROPIA = "autoservicio-propia@example.com";
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

const acceder = async (correo: string): Promise<string> => {
  situarseEnMotul();

  const respuesta = await manejarAuth(
    new Request(`${ORIGEN}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: correo, password: CLAVE }),
    }),
  );
  const cookie = respuesta.headers.get("set-cookie")?.split(";")[0];

  expect(respuesta.status).toBe(200);
  if (!cookie) throw new Error("El acceso no devolvio cookie de sesion.");

  return cookie;
};

const llamar = (ruta: string, cookie: string, cuerpo: unknown) =>
  manejarAuth(
    new Request(`${ORIGEN}/api/auth/${ruta}`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify(cuerpo),
    }),
  );

const credencialDe = (correo: string) =>
  withTenant(motul, (tx) =>
    tx
      .select({
        password: cuentas.password,
        claveTemporalEn: cuentas.claveTemporalEn,
      })
      .from(cuentas)
      .innerJoin(usuarios, eq(cuentas.userId, usuarios.id))
      .where(eq(usuarios.email, correo)),
  ).then(([fila]) => fila);

const personaDe = (correo: string) =>
  withTenant(motul, (tx) =>
    tx.select().from(usuarios).where(eq(usuarios.email, correo)),
  ).then(([fila]) => fila);

const trazasDe = (correo: string) =>
  withTenant(motul, async (tx) => {
    const persona = await tx
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, correo));

    return tx
      .select()
      .from(bitacora)
      .where(eq(bitacora.entidadId, persona[0]?.id ?? ""));
  });

const sembrarPersona = (correo: string, claveTemporal: boolean) =>
  withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre: `Persona de ${correo}`,
      email: correo,
      clave: CLAVE,
      rol: "OPERADOR",
      claveTemporal,
    }),
  );

beforeAll(async () => {
  await sembrar();
  await sembrarPersona(CORREO_MARCADA, true);
  await sembrarPersona(CORREO_PROPIA, false);
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("el autoservicio de la contrasenia", () => {
  it("no cambia el hash de una cuenta marcada, y no deja bitacora", async () => {
    const antes = await credencialDe(CORREO_MARCADA);
    const cookie = await acceder(CORREO_MARCADA);

    const respuesta = await llamar("change-password", cookie, {
      currentPassword: CLAVE,
      newPassword: CLAVE_NUEVA,
    });

    expect(respuesta.status).toBe(404);
    const despues = await credencialDe(CORREO_MARCADA);

    expect(despues?.password).toBe(antes?.password);
    expect(despues?.claveTemporalEn).toEqual(antes?.claveTemporalEn);
    expect(await verificarClave(despues?.password ?? "", CLAVE)).toBe(true);
    expect(await verificarClave(despues?.password ?? "", CLAVE_NUEVA)).toBe(
      false,
    );
    expect((await trazasDe(CORREO_MARCADA)).map((t) => t.accion)).not.toContain(
      "CAMBIAR_CONTRASENIA",
    );
  });

  it("tampoco esta abierto para una cuenta con clave propia", async () => {
    const antes = await credencialDe(CORREO_PROPIA);
    const cookie = await acceder(CORREO_PROPIA);

    const respuesta = await llamar("change-password", cookie, {
      currentPassword: CLAVE,
      newPassword: CLAVE_NUEVA,
    });

    expect(respuesta.status).toBe(404);
    expect((await credencialDe(CORREO_PROPIA))?.password).toBe(antes?.password);
  });
});

describe("el autoservicio del perfil", () => {
  it("una sesion con clave temporal no edita el perfil", async () => {
    const antes = await personaDe(CORREO_MARCADA);
    const cookie = await acceder(CORREO_MARCADA);

    const respuesta = await llamar("update-user", cookie, {
      name: "Nombre Que No Debe Quedar",
    });

    expect(respuesta.status).not.toBe(200);
    expect((await personaDe(CORREO_MARCADA))?.name).toBe(antes?.name);
  });

  it("una cuenta con clave propia sigue pudiendo editar el suyo", async () => {
    const cookie = await acceder(CORREO_PROPIA);

    const respuesta = await llamar("update-user", cookie, {
      name: "Nombre Cambiado",
    });

    expect(respuesta.status).toBe(200);
    expect((await personaDe(CORREO_PROPIA))?.name).toBe("Nombre Cambiado");
  });
});
