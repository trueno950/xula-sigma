import { and, eq } from "drizzle-orm";
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
import { foliosDeDocumentos } from "./infrastructure/esquema";

/**
 * `folios_de_documentos` no lleva `id`: su identidad **es** la tripleta
 * `(ayuntamientoId, tipo, anio)` (design.md seccion 4). El aislamiento y la
 * PK son las dos garantias que este archivo prueba.
 */

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento del contador de folios", () => {
  it("una consulta sin filtro solo devuelve la fila de contador del tenant activo", async () => {
    await withTenant(motul, (tx) =>
      tx.insert(foliosDeDocumentos).values({
        ayuntamientoId: motul,
        tipo: "VECINDAD",
        anio: 2026,
        ultimoConsecutivo: 1,
      }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(foliosDeDocumentos).values({
        ayuntamientoId: ticul,
        tipo: "VECINDAD",
        anio: 2026,
        ultimoConsecutivo: 1,
      }),
    );

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(foliosDeDocumentos),
    );

    expect(filas).toHaveLength(1);
    expect(filas[0]?.ayuntamientoId).toBe(motul);
  });

  it("dos filas para el mismo (ayuntamientoId, tipo, anio) son imposibles por la PK", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(foliosDeDocumentos).values({
          ayuntamientoId: motul,
          tipo: "VECINDAD",
          anio: 2026,
          ultimoConsecutivo: 99,
        }),
      ),
    );

    expect(motivo).toMatch(/folios_de_documentos_pk/i);

    const [fila] = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(foliosDeDocumentos)
        .where(
          and(
            eq(foliosDeDocumentos.ayuntamientoId, motul),
            eq(foliosDeDocumentos.tipo, "VECINDAD"),
            eq(foliosDeDocumentos.anio, 2026),
          ),
        ),
    );

    expect(fila?.ultimoConsecutivo).toBe(1);
  });
});
