import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { lugares } from "./infrastructure/esquema";
import { lectorDeContenidoDeLugaresSql } from "./infrastructure/lectorDeContenidoDeLugaresSql";
import {
  contextoDe,
  crearCalle,
  crearDomicilioEnCalle,
  crearLugar,
} from "./lugarDePrueba";

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

describe("contarPorLugar con un ciclo de padre_id", () => {
  it("cuenta cada domicilio una sola vez por ancestro aunque el ciclo repita el lugar", async () => {
    const a = await crearLugar("cabecera", "Ciclo A");
    const b = await crearLugar("colonia", "Ciclo B", a);
    const calle = await crearCalle(b, "Calle del ciclo");
    await crearDomicilioEnCalle(b, calle, "1");
    // Los casos de uso rechazan el ciclo; un UPDATE directo bajo el tenant
    // lo fabrica. El owner no sirve: las politicas de `lugares` son de xula_app.
    await withTenant(contextoDe().ayuntamientoId, (tx) =>
      tx.update(lugares).set({ padreId: b }).where(eq(lugares.id, a)),
    );

    const filas = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      lectorDeContenidoDeLugaresSql.contarPorLugar(tx),
    );
    const cuentas = new Map(filas.map((fila) => [fila.lugarId, fila]));

    expect(cuentas.get(a)?.domicilios).toBe(1);
    expect(cuentas.get(b)?.domicilios).toBe(1);
    expect(cuentas.get(b)?.calles).toBe(1);
  });
});
