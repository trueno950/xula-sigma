import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motivoDeFalla,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { type SemillasAuth, sembrarAuth } from "./datosDePrueba";
import { cuentas } from "./esquema";

let semillas: SemillasAuth;

beforeAll(async () => {
  await sembrar();
  semillas = await sembrarAuth();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento de cuentas", () => {
  it("una consulta sin filtro solo devuelve la cuenta del tenant activo", async () => {
    const filas = await withTenant(motul, (tx) => tx.select().from(cuentas));

    expect(filas).toHaveLength(1);
    expect(filas[0]?.ayuntamientoId).toBe(motul);
    expect(filas[0]?.id).toBe(semillas.enMotul.cuentaId);
  });

  it("el hash de contrasenia de Ticul no es alcanzable desde Motul", async () => {
    /**
     * `cuentas` es la tabla donde vive el hash, no `usuarios`. Es el dato
     * mas sensible de las cinco tablas: una fuga aca no expone un registro,
     * expone credenciales.
     */
    const filas = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(cuentas)
        .where(eq(cuentas.userId, semillas.enTicul.usuarioId)),
    );

    expect(filas).toHaveLength(0);
  });

  it("una credencial de Motul no puede apuntar a un usuario de Ticul", async () => {
    /**
     * Mismo hueco que en `sesiones`, y aca es peor: la fila lleva el hash
     * de una contrasenia. Una credencial de Motul colgada de una persona
     * de Ticul no es solo inconsistencia, es una credencial sin dueno
     * legible desde ningun municipio.
     */
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(cuentas).values({
          ayuntamientoId: motul,
          userId: semillas.enTicul.usuarioId,
          accountId: semillas.enTicul.usuarioId,
          providerId: "credential",
          password: "hash-de-usuario-ajeno",
        }),
      ),
    );

    expect(motivo).toMatch(/foreign key|cuentas_usuario_tenant_fk/i);
  });

  it("una credencial no se puede borrar: se revoca con la baja del usuario", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.execute(sql`DELETE FROM cuentas WHERE ayuntamiento_id = ${motul}`),
      ),
    );

    /**
     * Igual que en `usuarios`: no lo frena una politica sino la ausencia
     * del GRANT. `0001_auth.sql` lo declara como regla de negocio —la
     * credencial se revoca dando de baja a la persona, no borrandola por
     * separado— y hasta ahora era la unica de las cuatro asimetrias de
     * GRANT sin test. Con `DELETE` concedido, la baja logica deja de ser
     * el unico camino y nada falla.
     */
    expect(motivo).toMatch(/permission denied/i);
  });

  it("no se puede crear una credencial a nombre de otro municipio", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(cuentas).values({
          ayuntamientoId: ticul,
          userId: semillas.enMotul.usuarioId,
          accountId: semillas.enMotul.usuarioId,
          providerId: "credential",
          password: "hash-infiltrado",
        }),
      ),
    );

    expect(motivo).toMatch(/row-level security/i);
  });
});
