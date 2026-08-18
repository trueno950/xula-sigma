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
import { verificaciones } from "./esquema";

/**
 * El caso duro de las cinco tablas.
 *
 * `verificaciones` no tiene `userId`, asi que su tenant no se puede derivar
 * por join: lo pone el hook y lo obliga la politica. Si el mecanismo
 * fallara en alguna tabla, falla primero aca — y lo que viaja en estas
 * filas es un token que restablece una contrasenia.
 */

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

describe("aislamiento de verificaciones", () => {
  it("una consulta sin filtro solo devuelve el token del tenant activo", async () => {
    const filas = await withTenant(motul, (tx) =>
      tx.select().from(verificaciones),
    );

    expect(filas).toHaveLength(1);
    expect(filas[0]?.ayuntamientoId).toBe(motul);
    expect(filas[0]?.id).toBe(semillas.enMotul.verificacionId);
  });

  it("un token emitido en Ticul es invisible desde Motul", async () => {
    const filas = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(verificaciones)
        .where(
          eq(
            verificaciones.identifier,
            semillas.enTicul.verificacionIdentifier,
          ),
        ),
    );

    expect(filas).toHaveLength(0);
  });

  it("no se puede emitir un token a nombre de otro municipio", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(verificaciones).values({
          ayuntamientoId: ticul,
          identifier: "reset-password:infiltrado",
          value: "valor-infiltrado",
          expiresAt: new Date(Date.now() + 900_000),
        }),
      ),
    );

    expect(motivo).toMatch(/row-level security/i);
  });

  it("consumir desde Motul no consume el token de Ticul", async () => {
    /**
     * El adaptador consume el token borrando la fila, y por eso
     * `verificaciones` tiene GRANT de DELETE. El borrado cruzado no falla:
     * no alcanza ninguna fila. Verificar que la de Ticul sigue viva es lo
     * que distingue "no lo borro" de "lo borro y nadie miro".
     */
    await withTenant(motul, (tx) =>
      tx
        .delete(verificaciones)
        .where(
          eq(
            verificaciones.identifier,
            semillas.enTicul.verificacionIdentifier,
          ),
        ),
    );

    const sigueVivo = await withTenant(ticul, (tx) =>
      tx
        .select()
        .from(verificaciones)
        .where(
          eq(
            verificaciones.identifier,
            semillas.enTicul.verificacionIdentifier,
          ),
        ),
    );

    expect(sigueVivo).toHaveLength(1);
  });
});
