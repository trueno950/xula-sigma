import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearDetallesDeCalles } from "./application/detallesDeCalles";
import type { DetalleDeCalle } from "./application/puertosDeDetallesDeCalles";
import type { CalleId, LugarId, ZonaId } from "./domain";
import { calles, callesDeZonas, domicilios } from "./infrastructure/esquema";
import { zonas } from "./infrastructure/esquemaDeZonas";
import { lectorDeDetallesDeCallesSql } from "./infrastructure/lectorDeDetallesDeCallesSql";
import {
  contextoDe,
  crearCalle,
  crearDomicilioEnCalle,
  crearLugar,
} from "./lugarDePrueba";
import { crearZona } from "./zonaDePrueba";

const detallesDeCalles = crearDetallesDeCalles(lectorDeDetallesDeCallesSql);

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

/** La pertenencia calle-zona, sin pasar por el caso de uso que la audita. */
const enZona = (zonaId: ZonaId, calleId: CalleId, lugarId: LugarId) =>
  withTenant(motul, (tx) =>
    tx
      .insert(callesDeZonas)
      .values({ ayuntamientoId: motul, zonaId, calleId, lugarId }),
  );

const leer = (lugarId: LugarId): Promise<readonly DetalleDeCalle[]> =>
  detallesDeCalles(lugarId, contextoDe());

const porCalle = async (lugarId: LugarId) =>
  new Map((await leer(lugarId)).map((fila) => [fila.calleId, fila]));

describe("detallesDeCalles", () => {
  it("informa la zona activa y los domicilios vivos de cada calle", async () => {
    const cabecera = await crearLugar("cabecera", "Cabecera de detalles");
    const zona = await crearZona(cabecera, "Sector Norte");
    const calle = await crearCalle(cabecera, "Calle 20");
    await enZona(zona, calle, cabecera);
    await crearDomicilioEnCalle(cabecera, calle, "1");
    await crearDomicilioEnCalle(cabecera, calle, "2");
    const deBaja = await crearDomicilioEnCalle(cabecera, calle, "3");
    await withTenant(motul, (tx) =>
      tx
        .update(domicilios)
        .set({ bajaEn: new Date() })
        .where(eq(domicilios.id, deBaja)),
    );

    expect((await porCalle(cabecera)).get(calle)).toEqual({
      calleId: calle,
      zona: "Sector Norte",
      domicilios: 2,
    });
  });

  it("una calle sin zona dice null, y sin domicilios cuenta cero", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria de detalles");
    const calle = await crearCalle(comisaria, "Calle 24");

    expect((await porCalle(comisaria)).get(calle)).toEqual({
      calleId: calle,
      zona: null,
      domicilios: 0,
    });
  });

  it("una zona dada de baja no nombra la calle, y una calle de baja no aparece", async () => {
    const cabecera = await crearLugar("comisaria", "Comisaria de bajas");
    const zona = await crearZona(cabecera, "Sector Sur");
    const calle = await crearCalle(cabecera, "Calle 15");
    const calleBaja = await crearCalle(cabecera, "Calle 16");
    await enZona(zona, calle, cabecera);
    await withTenant(motul, async (tx) => {
      await tx
        .update(zonas)
        .set({ bajaEn: new Date() })
        .where(eq(zonas.id, zona));
      await tx
        .update(calles)
        .set({ bajaEn: new Date() })
        .where(eq(calles.id, calleBaja));
    });

    const detalles = await porCalle(cabecera);

    expect(detalles.get(calle)?.zona).toBeNull();
    expect(detalles.has(calleBaja)).toBe(false);
  });

  it("lee el catalogo entero del asentamiento en una sola llamada", async () => {
    const cabecera = await crearLugar("comisaria", "Comisaria de catalogo");
    const primera = await crearCalle(cabecera, "Calle 1");
    const segunda = await crearCalle(cabecera, "Calle 2");

    const detalles = await leer(cabecera);

    expect(detalles.map((fila) => fila.calleId).sort()).toEqual(
      [primera, segunda].sort(),
    );
  });
});
