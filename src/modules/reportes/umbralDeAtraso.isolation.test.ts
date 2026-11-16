import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { configuracionDeReportes } from "./infrastructure/esquema";

/**
 * Forma canonica del test de aislamiento (`invariantes-criticos.md`, Capa 2):
 * inserta directo con `withTenant`, sin pasar por el caso de uso.
 *
 * `configuracion_de_reportes` no lleva `id`: la identidad es
 * `ayuntamientoId`, una fila por municipio. El `GRANT` de la migracion no da
 * `DELETE` a proposito -el umbral se cambia, no se borra-, asi que el reset
 * es el mismo upsert que usa `cambiarUmbralDeAtraso`.
 */

/**
 * El mensaje del error original de Postgres. Drizzle envuelve la falla en un
 * `DrizzleQueryError` cuyo texto es el SQL; lo que distingue una violacion de
 * politica de una de CHECK vive en `cause`, y sin eso la asercion pasaria
 * por el motivo equivocado.
 */
const mensajeDePostgres = async (trabajo: () => Promise<unknown>) => {
  try {
    await trabajo();
  } catch (error) {
    const causa = (error as { cause?: { message?: string } }).cause;
    return causa?.message ?? (error as Error).message;
  }

  throw new Error("Se esperaba un fallo y la operacion salio bien.");
};

const umbralDe = async (municipio: typeof motul) => {
  const [fila] = await withTenant(municipio, (tx) =>
    tx
      .select({ diasDeAtraso: configuracionDeReportes.diasDeAtraso })
      .from(configuracionDeReportes),
  );
  return fila?.diasDeAtraso ?? null;
};

const sembrarUmbral = async (municipio: typeof motul, diasDeAtraso: number) =>
  withTenant(municipio, (tx) =>
    tx
      .insert(configuracionDeReportes)
      .values({ ayuntamientoId: municipio, diasDeAtraso })
      .onConflictDoUpdate({
        target: configuracionDeReportes.ayuntamientoId,
        set: { diasDeAtraso },
      }),
  );

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento de configuracion_de_reportes", () => {
  it("una consulta sin filtro solo devuelve el umbral del tenant activo", async () => {
    await sembrarUmbral(motul, 3);
    await sembrarUmbral(ticul, 21);

    const filasDeMotul = await withTenant(motul, (tx) =>
      tx.select().from(configuracionDeReportes),
    );

    expect(filasDeMotul).toHaveLength(1);
    expect(filasDeMotul[0]?.ayuntamientoId).toBe(motul);
    expect(filasDeMotul[0]?.diasDeAtraso).toBe(3);
  });

  it("RLS corta un UPDATE contra otro ayuntamiento aunque el WHERE lo nombre", async () => {
    await sembrarUmbral(motul, 3);
    await sembrarUmbral(ticul, 21);

    await withTenant(motul, (tx) =>
      tx
        .update(configuracionDeReportes)
        .set({ diasDeAtraso: 90 })
        .where(eq(configuracionDeReportes.ayuntamientoId, ticul)),
    );

    await expect(umbralDe(ticul)).resolves.toBe(21);
    await expect(umbralDe(motul)).resolves.toBe(3);
  });

  it("no se puede crear la fila de otro municipio desde el tenant activo", async () => {
    const intento = withTenant(motul, (tx) =>
      tx
        .insert(configuracionDeReportes)
        .values({ ayuntamientoId: ticul, diasDeAtraso: 1 })
        .onConflictDoUpdate({
          target: configuracionDeReportes.ayuntamientoId,
          set: { diasDeAtraso: 1 },
        }),
    );

    expect(await mensajeDePostgres(() => intento)).toMatch(
      /row-level security/i,
    );
    await expect(umbralDe(ticul)).resolves.not.toBe(1);
  });

  it("el CHECK de la base cierra el rango aunque la aplicacion se equivoque", async () => {
    const intento = withTenant(motul, (tx) =>
      tx
        .update(configuracionDeReportes)
        .set({ diasDeAtraso: 0 })
        .where(eq(configuracionDeReportes.ayuntamientoId, motul)),
    );

    expect(await mensajeDePostgres(() => intento)).toMatch(
      /violates check constraint/i,
    );
    await expect(umbralDe(motul)).resolves.toBe(3);
  });
});
