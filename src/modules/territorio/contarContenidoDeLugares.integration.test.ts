import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { calles, domicilios, lugares } from "./infrastructure/esquema";
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

const leer = async () => {
  const filas = await withTenant(contextoDe().ayuntamientoId, (tx) =>
    lectorDeContenidoDeLugaresSql.contarPorLugar(tx),
  );

  return new Map(filas.map((fila) => [fila.lugarId, fila]));
};

describe("contarPorLugar", () => {
  it("suma los domicilios de todo el subarbol y cuenta las calles propias, sin las bajas", async () => {
    const cabecera = await crearLugar("cabecera", "Cabecera de cuentas");
    const colonia = await crearLugar("colonia", "Colonia de cuentas", cabecera);
    const manzana = await crearLugar("manzana", "Manzana de cuentas", colonia);
    const calleA = await crearCalle(cabecera, "Calle 1");
    const calleBaja = await crearCalle(cabecera, "Calle de baja");
    await crearDomicilioEnCalle(cabecera, calleA, "1");
    await crearDomicilioEnCalle(colonia, calleA, "2");
    await crearDomicilioEnCalle(colonia, calleA, "3");
    await crearDomicilioEnCalle(manzana, calleA, "4");
    const dadoDeBaja = await crearDomicilioEnCalle(manzana, calleA, "5");
    await withTenant(contextoDe().ayuntamientoId, async (tx) => {
      await tx
        .update(calles)
        .set({ bajaEn: new Date() })
        .where(eq(calles.id, calleBaja));
      await tx
        .update(domicilios)
        .set({ bajaEn: new Date() })
        .where(eq(domicilios.id, dadoDeBaja));
    });

    const cuentas = await leer();

    expect(cuentas.get(cabecera)).toMatchObject({
      tipo: "cabecera",
      domicilios: 4,
      calles: 1,
    });
    expect(cuentas.get(colonia)?.domicilios).toBe(3);
    expect(cuentas.get(manzana)?.domicilios).toBe(1);
  });

  it("un lugar sin nada adentro cuenta cero, y uno dado de baja no aparece ni suma", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria vacia");
    const colonia = await crearLugar("colonia", "Colonia cerrada", comisaria);
    const calle = await crearCalle(comisaria, "Calle de la comisaria");
    await crearDomicilioEnCalle(colonia, calle, "1");
    await withTenant(contextoDe().ayuntamientoId, (tx) =>
      tx
        .update(lugares)
        .set({ bajaEn: new Date() })
        .where(eq(lugares.id, colonia)),
    );

    const cuentas = await leer();

    expect(cuentas.get(comisaria)).toMatchObject({ domicilios: 0, calles: 1 });
    expect(cuentas.has(colonia)).toBe(false);
  });

  it("una comisaria sin calles cuenta cero calles", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria sin calles");

    expect((await leer()).get(comisaria)?.calles).toBe(0);
  });
});
