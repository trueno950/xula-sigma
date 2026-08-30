import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ayuntamientos } from "@/shared/tenancy/esquema";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";

/**
 * Espejo exacto de `marca/escudo.isolation.test.ts`: la columna
 * `ayuntamientos.documentos` -el bloque de firma de `constancias`- se
 * aisla por la misma politica RLS que `marca`.
 */

const documentosDe = async (ayuntamientoId: typeof motul) => {
  const [fila] = await withTenant(ayuntamientoId, (tx) =>
    tx
      .select({ documentos: ayuntamientos.documentos })
      .from(ayuntamientos)
      .where(eq(ayuntamientos.id, ayuntamientoId)),
  );

  return fila?.documentos;
};

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  for (const ayuntamiento of [motul, ticul]) {
    await withTenant(ayuntamiento, (tx) =>
      tx
        .update(ayuntamientos)
        .set({ documentos: {} })
        .where(eq(ayuntamientos.id, ayuntamiento)),
    );
  }
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("documentos.isolation", () => {
  it("el bloque de firma de Motul no aparece al consultar desde Ticul sin filtro explicito", async () => {
    const bloqueDeFirma = {
      firmanteNombre: "Juan Poot",
      firmanteCargo: "Secretario Municipal",
    };

    await withTenant(motul, (tx) =>
      tx
        .update(ayuntamientos)
        .set({ documentos: bloqueDeFirma })
        .where(eq(ayuntamientos.id, motul)),
    );

    expect(await documentosDe(motul)).toEqual(bloqueDeFirma);
    expect(await documentosDe(ticul)).toEqual({});
  });

  it("RLS corta un UPDATE contra otro ayuntamiento aunque el WHERE lo nombre", async () => {
    /**
     * Simula el bug que `ayuntamientos_escritura_propia` existe para
     * evitar: un UPDATE armado con el id de Ticul mientras el tenant
     * fijado es Motul.
     */
    await withTenant(motul, (tx) =>
      tx
        .update(ayuntamientos)
        .set({ documentos: { firmanteNombre: "Intento cruzado" } })
        .where(eq(ayuntamientos.id, ticul)),
    );

    expect(await documentosDe(ticul)).toEqual({});
  });
});
