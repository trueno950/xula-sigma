import { eq } from "drizzle-orm";
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
import { sesiones, usuarios } from "./esquema";

/**
 * El test que justifica la forma de `instancia.ts`.
 *
 * Better Auth busca la persona por correo sin filtrar por tenant: es
 * codigo ajeno y no sabe que existen municipios. Si esa consulta corriera
 * fuera de la transaccion con `app.tenant` fijado, el acceso de Motul
 * podria resolver contra la persona de Ticul. Aca se prueba el caso que lo
 * provoca: **mismo correo y misma contrasenia en los dos municipios**.
 */

const CORREO = "tesoreria@example.com";
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

function peticion(tenant: Municipio, ruta: string, cuerpo: unknown) {
  return new Request(
    `http://${tenant.subdominio}.localhost:3000/api/auth/${ruta}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(cuerpo),
    },
  );
}

function acceso(tenant: Municipio, clave = CLAVE) {
  tenantDelRequest = tenant;
  return manejarAuth(
    peticion(tenant, "sign-in/email", { email: CORREO, password: clave }),
  );
}

beforeAll(async () => {
  await sembrar();

  // La misma persona, en los dos municipios. Son dos personas distintas
  // que comparten correo y clave, que es el caso incomodo.
  for (const ayuntamiento of [motul, ticul]) {
    await withTenant(ayuntamiento, (tx) =>
      altaDePersona(tx, ayuntamiento, {
        nombre: "Persona de Prueba",
        email: CORREO,
        clave: CLAVE,
        rol: "OPERADOR",
      }),
    );
  }
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("acceso cruzado entre municipios", () => {
  it("el mismo correo existe en los dos municipios, como dos personas", async () => {
    const deMotul = await withTenant(motul, (tx) =>
      tx.select().from(usuarios).where(eq(usuarios.email, CORREO)),
    );
    const deTicul = await withTenant(ticul, (tx) =>
      tx.select().from(usuarios).where(eq(usuarios.email, CORREO)),
    );

    expect(deMotul).toHaveLength(1);
    expect(deTicul).toHaveLength(1);
    expect(deMotul[0]?.id).not.toBe(deTicul[0]?.id);
  });

  it("cada quien accede en su municipio", async () => {
    expect((await acceso(enMotul)).status).toBe(200);
    expect((await acceso(enTicul)).status).toBe(200);
  });

  it("el acceso resuelve contra la persona del municipio del request", async () => {
    const respuesta = await acceso(enMotul);
    const { user } = (await respuesta.json()) as { user: { id: string } };

    const [enSuMunicipio] = await withTenant(motul, (tx) =>
      tx.select().from(usuarios).where(eq(usuarios.id, user.id)),
    );

    // Si la busqueda por correo escapara del tenant, este id podria ser el
    // de la persona de Ticul y esta consulta devolveria vacio.
    expect(enSuMunicipio?.ayuntamientoId).toBe(motul);
  });

  it("la sesion se crea en el municipio del request", async () => {
    await acceso(enTicul);

    const deTicul = await withTenant(ticul, (tx) => tx.select().from(sesiones));
    const deMotul = await withTenant(motul, (tx) => tx.select().from(sesiones));

    for (const sesion of deTicul) expect(sesion.ayuntamientoId).toBe(ticul);
    for (const sesion of deMotul) expect(sesion.ayuntamientoId).toBe(motul);
  });

  it("una clave equivocada no entra", async () => {
    expect((await acceso(enMotul, "clave-larga-y-mala")).status).not.toBe(200);
  });

  it("una persona dada de baja no accede, y la del otro municipio si", async () => {
    await withTenant(motul, (tx) =>
      tx
        .update(usuarios)
        .set({ bajaEn: new Date() })
        .where(eq(usuarios.email, CORREO)),
    );

    expect((await acceso(enMotul)).status).not.toBe(200);
    // La baja es de una persona, no del correo.
    expect((await acceso(enTicul)).status).toBe(200);

    await withTenant(motul, (tx) =>
      tx
        .update(usuarios)
        .set({ bajaEn: null })
        .where(eq(usuarios.email, CORREO)),
    );
  });

  it("el registro publico esta apagado", async () => {
    tenantDelRequest = enMotul;
    const respuesta = await manejarAuth(
      peticion(enMotul, "sign-up/email", {
        email: "colado@example.com",
        password: CLAVE,
        name: "Colado",
      }),
    );

    expect(respuesta.status).not.toBe(200);

    const colados = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(usuarios)
        .where(eq(usuarios.email, "colado@example.com")),
    );

    expect(colados).toHaveLength(0);
  });
});
