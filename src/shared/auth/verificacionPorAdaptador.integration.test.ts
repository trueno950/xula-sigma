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
import { verificaciones } from "./esquema";

/**
 * `verificaciones` es la unica de las cinco tablas cuyo tenant no se puede
 * derivar por join: la fila no tiene `userId`. Lo pone `create.before` y
 * nada mas. Este archivo es lo que verifica que ese gancho corre.
 *
 * Va por el adaptador y no por Drizzle a proposito —el aislamiento crudo ya
 * lo cubre `verificaciones.isolation.test.ts`— porque el riesgo esta en el
 * camino de la libreria: `findVerificationValue` busca **solo por
 * `identifier`, sin filtro de tenant** (`db/internal-adapter.mjs:600` en
 * 1.6.29). Mismo agujero que `findUserByEmail`, y la misma respuesta: la
 * consulta es correcta porque corre adentro de `withTenant`.
 *
 * Todavia no hay flujo de produccion que escriba aca —restablecimiento de
 * contrasenia necesita envio de correo, que no existe— asi que el test
 * llama `createVerificationValue` directo. Es la misma funcion que usa la
 * ruta real: `api/routes/password.mjs:75` la invoca **antes** de mandar el
 * correo. Cuando entre el envio, el gancho ya esta cubierto.
 */

let tenantDelRequest: { id: AyuntamientoId; subdominio: string };

vi.mock("@/shared/tenancy/contexto", () => ({
  ayuntamientoActual: async () => tenantDelRequest,
}));

const { conAuth } = await import("./instancia");

const enMotul = { id: motul, subdominio: subdominioMotul };
const enTicul = { id: ticul, subdominio: subdominioTicul };

type Municipio = typeof enMotul;

const IDENT_MOTUL = "reset-password:token-de-motul";
const IDENT_TICUL = "reset-password:token-de-ticul";

const origenDe = (tenant: Municipio) =>
  `http://${tenant.subdominio}.localhost:3000`;

function crearToken(tenant: Municipio, identifier: string) {
  tenantDelRequest = tenant;

  return conAuth(origenDe(tenant), async (auth) => {
    const { internalAdapter } = await auth.$context;

    return internalAdapter.createVerificationValue({
      identifier,
      value: `valor-de-${tenant.subdominio}`,
      expiresAt: new Date(Date.now() + 900_000),
    });
  });
}

function buscarToken(tenant: Municipio, identifier: string) {
  tenantDelRequest = tenant;

  return conAuth(origenDe(tenant), async (auth) => {
    const { internalAdapter } = await auth.$context;

    return internalAdapter.findVerificationValue(identifier);
  });
}

beforeAll(async () => {
  await sembrar();
  await crearToken(enMotul, IDENT_MOTUL);
  await crearToken(enTicul, IDENT_TICUL);
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("verificaciones escritas por la libreria", () => {
  it("el token queda en el municipio del request", async () => {
    /**
     * Sin el gancho la fila sale sin `ayuntamiento_id`, y el `WITH CHECK`
     * de la politica evalua NULL: el INSERT se rechaza y la siembra de este
     * archivo revienta antes de llegar aca. El rojo es ruidoso a proposito.
     */
    const [token] = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(verificaciones)
        .where(eq(verificaciones.identifier, IDENT_MOTUL)),
    );

    expect(token?.ayuntamientoId).toBe(motul);
  });

  it("un token de Motul no se canjea desde Ticul", async () => {
    /**
     * El caso que importa. `findVerificationValue` no filtra por tenant:
     * si esta consulta corriera fuera de `withTenant`, Ticul canjearia el
     * token de restablecimiento de una persona de Motul y le cambiaria la
     * contrasenia.
     */
    expect(await buscarToken(enTicul, IDENT_MOTUL)).toBeNull();
    expect(await buscarToken(enMotul, IDENT_TICUL)).toBeNull();
  });

  it("y cada municipio si canjea el suyo", async () => {
    // Control positivo: sin esto, un `findVerificationValue` que devolviera
    // `null` siempre —tabla vacia, gancho roto— dejaria verde el test de
    // arriba sin probar nada.
    expect(await buscarToken(enMotul, IDENT_MOTUL)).toMatchObject({
      identifier: IDENT_MOTUL,
      value: `valor-de-${subdominioMotul}`,
    });
    expect(await buscarToken(enTicul, IDENT_TICUL)).toMatchObject({
      identifier: IDENT_TICUL,
    });
  });

  it("dos municipios pueden tener el mismo identificador", async () => {
    /**
     * `identifier` lleva un token aleatorio, asi que la colision es
     * improbable —no imposible. Un `unique(identifier)` global la volveria
     * un fallo entre municipios: el token de Ticul le negaria el alta al de
     * Motul. El indice tiene que ser compuesto con el tenant.
     */
    const compartido = "reset-password:mismo-token-en-los-dos";

    await crearToken(enMotul, compartido);
    await crearToken(enTicul, compartido);

    const deMotul = await buscarToken(enMotul, compartido);
    const deTicul = await buscarToken(enTicul, compartido);

    expect(deMotul?.value).toBe(`valor-de-${subdominioMotul}`);
    expect(deTicul?.value).toBe(`valor-de-${subdominioTicul}`);
  });
});
