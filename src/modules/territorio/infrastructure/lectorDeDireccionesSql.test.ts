import { describe, expect, it, vi } from "vitest";
import type { TransaccionTenant } from "@/shared/tenancy/withTenant";
import { comoDomicilioId } from "../domain";
import { lectorDeDireccionesSql } from "./lectorDeDireccionesSql";

/**
 * `tx` fabricado a mano, mismo patron que `repositorioDePersonasSql.test.ts`:
 * alcanza con mockear `tx.execute` -el CTE de ascenso es la unica parte del
 * adaptador con decision, y corre sin Postgres.
 */
const txDeLectura = (filas: readonly Record<string, unknown>[]) => {
  const execute = vi.fn().mockResolvedValue(filas);

  return { tx: { execute } as unknown as TransaccionTenant, execute };
};

const domicilioId = comoDomicilioId("11111111-1111-4111-8111-111111111111");

describe("lectorDeDireccionesSql", () => {
  it("resuelve la cadena completa de ancestros de un domicilio con manzana conocida", async () => {
    const { tx } = txDeLectura([
      {
        calle: "Calle 20",
        numero: "105",
        entreCalleA: "Calle 21",
        entreCalleB: "Calle 23",
        referencia: null,
        nombreAncestro: "Manzana 5",
      },
      {
        calle: "Calle 20",
        numero: "105",
        entreCalleA: "Calle 21",
        entreCalleB: "Calle 23",
        referencia: null,
        nombreAncestro: "Colonia Centro",
      },
      {
        calle: "Calle 20",
        numero: "105",
        entreCalleA: "Calle 21",
        entreCalleB: "Calle 23",
        referencia: null,
        nombreAncestro: "Sector 2",
      },
      {
        calle: "Calle 20",
        numero: "105",
        entreCalleA: "Calle 21",
        entreCalleB: "Calle 23",
        referencia: null,
        nombreAncestro: "Motul",
      },
    ]);

    const partes = await lectorDeDireccionesSql.partesDe(tx, domicilioId);

    expect(partes).toEqual({
      calle: "Calle 20",
      numero: "105",
      entreCalleA: "Calle 21",
      entreCalleB: "Calle 23",
      referencia: null,
      ancestros: ["Manzana 5", "Colonia Centro", "Sector 2", "Motul"],
    });
  });

  it("un domicilio colgado directo de una colonia devuelve solo los niveles presentes, sin fallar", async () => {
    const { tx } = txDeLectura([
      {
        calle: "Calle 45",
        numero: null,
        entreCalleA: null,
        entreCalleB: null,
        referencia: "Frente a la plaza",
        nombreAncestro: "Colonia San Francisco",
      },
      {
        calle: "Calle 45",
        numero: null,
        entreCalleA: null,
        entreCalleB: null,
        referencia: "Frente a la plaza",
        nombreAncestro: "Motul",
      },
    ]);

    const partes = await lectorDeDireccionesSql.partesDe(tx, domicilioId);

    expect(partes).toEqual({
      calle: "Calle 45",
      numero: null,
      entreCalleA: null,
      entreCalleB: null,
      referencia: "Frente a la plaza",
      ancestros: ["Colonia San Francisco", "Motul"],
    });
  });

  it("domicilio inexistente o de otro tenant devuelve null", async () => {
    const { tx } = txDeLectura([]);

    const partes = await lectorDeDireccionesSql.partesDe(tx, domicilioId);

    expect(partes).toBeNull();
  });
});
