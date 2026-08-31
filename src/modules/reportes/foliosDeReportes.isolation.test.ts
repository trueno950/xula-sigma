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
import { foliosDeReportes } from "./infrastructure/esquema";

/**
 * `folios_de_reportes` no lleva `id`: su identidad **es** la tupla
 * `(ayuntamientoId, anio)` (design.md seccion 4). El aislamiento y la PK son
 * las dos garantias que este archivo prueba, mismo patron que
 * `constancias/folios.isolation.test.ts`.
 */

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento del contador de folios de reportes", () => {
  it("una consulta sin filtro solo devuelve la fila de contador del tenant activo", async () => {
    await withTenant(motul, (tx) =>
      tx.insert(foliosDeReportes).values({
        ayuntamientoId: motul,
        anio: 2026,
        ultimoConsecutivo: 1,
      }),
    );
    await withTenant(ticul, (tx) =>
      tx.insert(foliosDeReportes).values({
        ayuntamientoId: ticul,
        anio: 2026,
        ultimoConsecutivo: 1,
      }),
    );

    const filas = await withTenant(motul, (tx) =>
      tx.select().from(foliosDeReportes),
    );

    expect(filas).toHaveLength(1);
    expect(filas[0]?.ayuntamientoId).toBe(motul);
  });

  it("dos filas para el mismo (ayuntamientoId, anio) son imposibles por la PK", async () => {
    const motivo = await motivoDeFalla(() =>
      withTenant(motul, (tx) =>
        tx.insert(foliosDeReportes).values({
          ayuntamientoId: motul,
          anio: 2026,
          ultimoConsecutivo: 99,
        }),
      ),
    );

    expect(motivo).toMatch(/folios_de_reportes_pk/i);

    const [fila] = await withTenant(motul, (tx) =>
      tx
        .select()
        .from(foliosDeReportes)
        .where(
          and(
            eq(foliosDeReportes.ayuntamientoId, motul),
            eq(foliosDeReportes.anio, 2026),
          ),
        ),
    );

    expect(fila?.ultimoConsecutivo).toBe(1);
  });
});
