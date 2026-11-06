import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearDarDeBajaLugar } from "./application/darDeBajaLugar";
import type { LugarId } from "./domain";
import { lugares } from "./infrastructure/esquema";
import { zonas } from "./infrastructure/esquemaDeZonas";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import { contextoDe, crearCalleEn, crearLugarEn } from "./lugarDePrueba";

/**
 * El bloqueo y las cuentas de la baja corren bajo RLS: desde Motul, un
 * lugar de Ticul no se bloquea, no tiene calles ni zonas, y no se da de
 * baja.
 */

let lugarDeTicul: LugarId;

beforeAll(async () => {
  await sembrar();
  lugarDeTicul = await crearLugarEn(ticul, "comisaria", "Pustunich");
  await crearCalleEn(ticul, lugarDeTicul, "Calle de Ticul");
  await withTenant(ticul, (tx) =>
    tx
      .insert(zonas)
      .values({ ayuntamientoId: ticul, lugarId: lugarDeTicul, nombre: "Zona" }),
  );
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("aislamiento del bloqueo y las cuentas de lugares", () => {
  it("desde otro municipio el lugar no se bloquea ni se le cuentan calles o zonas", async () => {
    const vistoDesdeMotul = await withTenant(motul, async (tx) => ({
      bloqueado: await repositorioDeLugaresSql.bloquearPorId(tx, lugarDeTicul),
      calles: await repositorioDeLugaresSql.contarCallesActivas(
        tx,
        lugarDeTicul,
      ),
      zonas: await repositorioDeLugaresSql.contarZonasActivas(tx, lugarDeTicul),
    }));

    expect(vistoDesdeMotul).toEqual({ bloqueado: null, calles: 0, zonas: 0 });
  });

  it("desde su propio municipio si se ven sus calles y zonas", async () => {
    const vistoDesdeTicul = await withTenant(ticul, async (tx) => ({
      calles: await repositorioDeLugaresSql.contarCallesActivas(
        tx,
        lugarDeTicul,
      ),
      zonas: await repositorioDeLugaresSql.contarZonasActivas(tx, lugarDeTicul),
    }));

    expect(vistoDesdeTicul).toEqual({ calles: 1, zonas: 1 });
  });

  it("dar de baja un lugar de otro municipio responde 404 y no lo toca", async () => {
    const darDeBajaLugar = crearDarDeBajaLugar(repositorioDeLugaresSql);

    await expect(
      darDeBajaLugar(lugarDeTicul, contextoDe()),
    ).rejects.toBeInstanceOf(NoEncontradoError);

    const [fila] = await withTenant(ticul, (tx) =>
      tx
        .select({ bajaEn: lugares.bajaEn })
        .from(lugares)
        .where(eq(lugares.id, lugarDeTicul)),
    );
    expect(fila?.bajaEn).toBeNull();
  });
});
