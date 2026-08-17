import { eq } from "drizzle-orm";
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
