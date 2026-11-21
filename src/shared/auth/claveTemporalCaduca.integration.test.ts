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
import { CLAVE_TEMPORAL_CADUCADA } from "./claveTemporalEnCuenta";
import { cuentas, sesiones } from "./esquema";

/**
 * S1 contra Postgres: entrar con una temporal caducada se rechaza **antes**
 * de crear la sesion. La prueba de que fue antes es `sesiones`: cero filas.
 *
 * Corre por `manejarAuth` y no por `signInEmail` para que el camino sea el
 * real —el mismo handler que sirve `/api/auth/*`—, incluida la transaccion
 * de `withTenant` que se lleva el intento cuando el gancho aborta.
 */

const CLAVE = "clave-larga-y-buena";
const CORREO_TEMPORAL = "temporal@example.com";
const CORREO_PROPIA = "propia@example.com";
const CORREO_INEXISTENTE = "nadie@example.com";

let cabecerasDelRequest = new Headers();

vi.mock("next/headers", () => ({ headers: async () => cabecerasDelRequest }));

const { manejarAuth } = await import("./instancia");

const situarseEnMotul = () => {
  cabecerasDelRequest = new Headers({
    host: `${subdominioMotul}.localhost:3000`,
    [CABECERA_SUBDOMINIO]: subdominioMotul,
  });
};

const acceder = (correo: string, clave = CLAVE) => {
  situarseEnMotul();

  return manejarAuth(
    new Request(
      `http://${subdominioMotul}.localhost:3000/api/auth/sign-in/email`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: correo, password: clave }),
      },
    ),
  );
};

/** Lo que devuelve el rechazo que la pantalla de acceso tiene que redactar. */
const cuerpoDe = async (respuesta: Response) =>
  (await respuesta.json()) as { code?: string; message?: string };

const sesionesDe = (usuarioId: string) =>
  withTenant(motul, (tx) =>
    tx.select().from(sesiones).where(eq(sesiones.userId, usuarioId)),
  );

const credencialDe = (usuarioId: string) =>
  withTenant(motul, (tx) =>
    tx.select().from(cuentas).where(eq(cuentas.userId, usuarioId)),
  ).then(([fila]) => fila);

const envejecerLaTemporal = (usuarioId: string, horas: number) =>
  withTenant(motul, (tx) =>
    tx
      .update(cuentas)
      .set({ claveTemporalEn: new Date(Date.now() - horas * 3_600_000) })
      .where(eq(cuentas.userId, usuarioId)),
  );

const darDeAlta = (correo: string, claveTemporal: boolean) =>
  withTenant(motul, (tx) =>
    altaDePersona(tx, motul, {
      nombre: `Persona de ${correo}`,
      email: correo,
      clave: CLAVE,
      rol: "OPERADOR",
      claveTemporal,
    }),
  ).then(({ id }) => id);

let idTemporal = "";
let idPropia = "";

beforeAll(async () => {
  await sembrar();
  idTemporal = await darDeAlta(CORREO_TEMPORAL, true);
  idPropia = await darDeAlta(CORREO_PROPIA, false);
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("entrar con una contrasenia temporal", () => {
  it("una temporal de mas de 24 horas se rechaza y no abre sesion", async () => {
    const usuarioId = idTemporal;

    await envejecerLaTemporal(usuarioId, 25);

    const respuesta = await acceder(CORREO_TEMPORAL);
    const cuerpo = await cuerpoDe(respuesta);

    expect(respuesta.status).toBe(403);
    expect(cuerpo.code).toBe(CLAVE_TEMPORAL_CADUCADA);
    await expect(sesionesDe(usuarioId)).resolves.toHaveLength(0);
  });

  it("una clave equivocada sobre una temporal caducada responde igual que una cuenta inexistente", async () => {
    await envejecerLaTemporal(idTemporal, 25);

    const equivocada = await acceder(CORREO_TEMPORAL, "otra-clave-larga");
    const inexistente = await acceder(CORREO_INEXISTENTE);

    expect(equivocada.status).toBe(401);
    expect(equivocada.status).toBe(inexistente.status);
    await expect(cuerpoDe(equivocada)).resolves.toEqual(
      await cuerpoDe(inexistente),
    );
  });

  it("una temporal vigente entra, y la cuenta queda marcada como temporal", async () => {
    const usuarioId = idPropia;

    // Se le pone una temporal recien emitida a la cuenta que nacio con clave
    // propia: el marcador es lo que define que la credencial es temporal.
    await withTenant(motul, (tx) =>
      tx
        .update(cuentas)
        .set({ claveTemporalEn: new Date(Date.now() - 23 * 3_600_000) })
        .where(eq(cuentas.userId, usuarioId)),
    );

    const respuesta = await acceder(CORREO_PROPIA);

    expect(respuesta.status).toBe(200);
    await expect(sesionesDe(usuarioId)).resolves.toHaveLength(1);
    expect((await credencialDe(usuarioId))?.claveTemporalEn).toBeInstanceOf(
      Date,
    );
  });

  it("una clave propia entra: la marca ausente es la clave de la persona", async () => {
    const usuarioId = idTemporal;

    await withTenant(motul, (tx) =>
      tx
        .update(cuentas)
        .set({ claveTemporalEn: null })
        .where(eq(cuentas.userId, usuarioId)),
    );

    const respuesta = await acceder(CORREO_TEMPORAL);

    expect(respuesta.status).toBe(200);
    await expect(sesionesDe(usuarioId)).resolves.toHaveLength(1);
  });

  it("no revela si la cuenta existe: una clave equivocada responde igual que una cuenta inexistente", async () => {
    const conClaveEquivocada = await acceder(
      CORREO_TEMPORAL,
      "otra-clave-larga",
    );
    const inexistente = await acceder(CORREO_INEXISTENTE);

    expect(conClaveEquivocada.status).toBe(inexistente.status);
    expect(conClaveEquivocada.status).toBe(401);
    await expect(cuerpoDe(conClaveEquivocada)).resolves.toEqual(
      await cuerpoDe(inexistente),
    );
  });
});
