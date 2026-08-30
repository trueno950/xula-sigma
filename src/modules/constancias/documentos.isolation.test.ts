import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { configuracionDeDocumentos } from "./infrastructure/esquema";

/**
 * `configuracion_de_documentos` no lleva `id`: la identidad es
 * `ayuntamientoId`, una fila por municipio -no vive en `ayuntamientos`
 * porque esa tabla tiene lectura publica a proposito, ver el comentario de
 * la tabla en `infrastructure/esquema.ts`-.
 *
 * `beforeEach` sube ambos tenants con `onConflictDoUpdate`, no `DELETE`
 * -el `GRANT` de la migracion no le da `DELETE` a `xula_app` a proposito-,
 * asi que el reset entre tests usa el mismo mecanismo que va a usar
 * `configurarDocumentos` en la Fase 3.
 */

beforeAll(async () => {
  await sembrar();
});

beforeEach(async () => {
  for (const ayuntamientoId of [motul, ticul]) {
    await withTenant(ayuntamientoId, (tx) =>
      tx
        .insert(configuracionDeDocumentos)
        .values({ ayuntamientoId, datos: {} })
        .onConflictDoUpdate({
          target: configuracionDeDocumentos.ayuntamientoId,
          set: { datos: {} },
        }),
    );
  }
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento de configuracion_de_documentos", () => {
  it("una consulta sin filtro solo devuelve el bloque de firma del tenant activo", async () => {
    const bloqueDeFirma = {
      firmanteNombre: "Juan Poot",
      firmanteCargo: "Secretario Municipal",
    };

    await withTenant(motul, (tx) =>
      tx
        .update(configuracionDeDocumentos)
        .set({ datos: bloqueDeFirma })
        .where(eq(configuracionDeDocumentos.ayuntamientoId, motul)),
    );

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(configuracionDeDocumentos),
    );

    expect(filas).toHaveLength(1);
    expect(filas[0]?.ayuntamientoId).toBe(motul);
    expect(filas[0]?.datos).toEqual(bloqueDeFirma);
  });

  it("RLS corta un UPDATE contra otro ayuntamiento aunque el WHERE lo nombre", async () => {
    // Simula el bug que la politica de tenant existe para evitar: un
    // UPDATE armado con el id de Ticul mientras el tenant fijado es Motul.
    await withTenant(motul, (tx) =>
      tx
        .update(configuracionDeDocumentos)
        .set({ datos: { firmanteNombre: "Intento cruzado" } })
        .where(eq(configuracionDeDocumentos.ayuntamientoId, ticul)),
    );

    const [fila] = await withTenant(ticul, (tx) =>
      tx.select().from(configuracionDeDocumentos),
    );
    expect(fila?.datos).toEqual({});
  });
});
