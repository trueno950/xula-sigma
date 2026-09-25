import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ContextoActual } from "@/shared/auth/contexto";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAltaDeLugar } from "./application/altaDeLugar";
import { CabeceraDuplicadaError } from "./domain";
import { lugares } from "./infrastructure/esquema";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe } from "./lugarDePrueba";

/**
 * `lugares_una_cabecera` es un indice unico parcial POR municipio
 * (`ayuntamiento_id` + `tipo = 'cabecera'`): la cabecera de uno no ocupa el
 * lugar de la de otro.
 */

const enMotul = contextoDe();
const enTicul: ContextoActual = { ...enMotul, ayuntamientoId: ticul };

const altaDeLugar = crearAltaDeLugar(repositorioDeLugaresSql);
const nuevaCabecera = (nombre: string) => ({
  tipo: "cabecera" as const,
  nombre,
  padreId: null,
});

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("alta de la cabecera municipal", () => {
  it("una segunda cabecera del mismo municipio se rechaza con un error de dominio", async () => {
    await altaDeLugar(nuevaCabecera("Motul de Carrillo Puerto"), enMotul);

    await expect(
      altaDeLugar(nuevaCabecera("Otra cabecera"), enMotul),
    ).rejects.toBeInstanceOf(CabeceraDuplicadaError);
  });

  it("el rechazo no deja escrita la segunda cabecera", async () => {
    const cabeceras = await withTenant(motul, async (tx) =>
      (await repositorioDeLugaresSql.listarRaices(tx)).filter(
        (lugar) => lugar.tipo === "cabecera",
      ),
    );

    expect(cabeceras.map((lugar) => lugar.nombre)).toEqual([
      "Motul de Carrillo Puerto",
    ]);
  });

  it("la cabecera de Motul no impide dar de alta la de Ticul", async () => {
    const { id } = await altaDeLugar(nuevaCabecera("Ticul"), enTicul);

    expect(id).toBeTruthy();
  });

  it("una cabecera dada de baja sigue ocupando el lugar de la unica", async () => {
    const ticulSegunda = await altaDeLugar(
      nuevaCabecera("Ticul bis"),
      enTicul,
    ).catch((error: unknown) => error);

    expect(ticulSegunda).toBeInstanceOf(CabeceraDuplicadaError);

    await withTenant(ticul, (tx) =>
      tx
        .update(lugares)
        .set({ bajaEn: new Date() })
        .where(eq(lugares.tipo, "cabecera")),
    );

    await expect(
      altaDeLugar(nuevaCabecera("Ticul de nuevo"), enTicul),
    ).rejects.toBeInstanceOf(CabeceraDuplicadaError);
  });

  it("un tipo distinto sigue entrando aunque ya haya cabecera", async () => {
    await expect(
      altaDeLugar(
        { tipo: "comisaria", nombre: "Dzununcan", padreId: null },
        enMotul,
      ),
    ).resolves.toEqual({ id: expect.any(String) });
  });
});
