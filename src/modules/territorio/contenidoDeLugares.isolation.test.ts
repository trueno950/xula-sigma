import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { lectorDeContenidoDeLugaresSql } from "./infrastructure/lectorDeContenidoDeLugaresSql";
import {
  crearCalleEn,
  crearDomicilioEnCalleEn,
  crearLugarEn,
  crearLugarHijoEn,
} from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const leer = async (ayuntamientoId: typeof motul) =>
  withTenant(ayuntamientoId, (tx) =>
    lectorDeContenidoDeLugaresSql.contarPorLugar(tx),
  );

describe("aislamiento de las cuentas de lugares", () => {
  it("los lugares, calles y domicilios de otro municipio nunca entran a las cuentas", async () => {
    const enMotul = await crearLugarEn(motul, "cabecera", "Cabecera de Motul");
    const calleMotul = await crearCalleEn(motul, enMotul, "Calle de Motul");
    await crearDomicilioEnCalleEn(motul, enMotul, calleMotul);

    const enTicul = await crearLugarEn(ticul, "cabecera", "Cabecera de Ticul");
    const coloniaTicul = await crearLugarHijoEn({
      ayuntamientoId: ticul,
      tipo: "colonia",
      nombre: "Colonia de Ticul",
      padreId: enTicul,
    });
    const calleTicul = await crearCalleEn(ticul, enTicul, "Calle de Ticul");
    await crearCalleEn(ticul, enTicul, "Otra calle de Ticul");
    await crearDomicilioEnCalleEn(ticul, coloniaTicul, calleTicul);
    await crearDomicilioEnCalleEn(ticul, enTicul, calleTicul);

    const cuentasDeMotul = await leer(motul);
    const ids = cuentasDeMotul.map((fila) => fila.lugarId);

    expect(ids).toContain(enMotul);
    expect(ids).not.toContain(enTicul);
    expect(ids).not.toContain(coloniaTicul);
    expect(cuentasDeMotul.find((f) => f.lugarId === enMotul)).toMatchObject({
      domicilios: 1,
      calles: 1,
    });

    const cuentasDeTicul = await leer(ticul);
    expect(cuentasDeTicul.find((f) => f.lugarId === enTicul)).toMatchObject({
      domicilios: 2,
      calles: 2,
    });
    expect(cuentasDeTicul.map((f) => f.lugarId)).not.toContain(enMotul);
  });
});
