import { describe, expect, it, vi } from "vitest";
import type { AyuntamientoId } from "@/shared/tenancy/ayuntamientoId";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { repositorioDeDocumentosSql } from "./repositorioDeDocumentosSql";

const MOTUL = "11111111-1111-1111-1111-111111111111" as AyuntamientoId;

/**
 * `tx` fabricado a mano: alcanza con la parte de la cadena de Drizzle que
 * `repositorioDeDocumentosSql` realmente usa, mismo patron que
 * `catalogoDeAbreviaturasSql.test.ts`. La cobertura real contra Postgres es
 * `documentos.isolation.test.ts` y el test de integracion de la Fase 3
 * (design.md de `constancias-oficios`, decision 8).
 */
const txDeLectura = (fila: { datos: unknown } | undefined) => {
  const where = vi.fn().mockResolvedValue(fila ? [fila] : []);
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });

  return { tx: { select } as unknown as TransaccionTenant, select };
};

const txDeEscritura = () => {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
  const insert = vi.fn().mockReturnValue({ values });

  return {
    tx: { insert } as unknown as TransaccionTenant,
    insert,
    values,
    onConflictDoUpdate,
  };
};

describe("repositorioDeDocumentosSql", () => {
  it("leer devuelve el datos crudo de la fila del ayuntamiento", async () => {
    const { tx } = txDeLectura({ datos: { firmanteNombre: "Juan Poot" } });

    const resultado = await repositorioDeDocumentosSql.leer(tx, MOTUL);

    expect(resultado).toEqual({ firmanteNombre: "Juan Poot" });
  });

  it("leer devuelve null cuando el ayuntamiento no tiene fila", async () => {
    const { tx } = txDeLectura(undefined);

    expect(await repositorioDeDocumentosSql.leer(tx, MOTUL)).toBeNull();
  });

  it("escribir compone un upsert sobre la PK, nunca dos caminos", async () => {
    // La tabla no tiene GRANT de DELETE: la configuracion se actualiza via
    // INSERT ... ON CONFLICT (ayuntamiento_id) DO UPDATE, nunca un UPDATE a
    // secas que asuma que la fila ya existe (design.md decision 8).
    const { tx, insert, values, onConflictDoUpdate } = txDeEscritura();
    const datos = { firmanteNombre: "Juan Poot", firmanteCargo: "Secretario" };

    await repositorioDeDocumentosSql.escribir(tx, MOTUL, datos);

    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith({ ayuntamientoId: MOTUL, datos });
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ set: { datos } }),
    );
  });
});
