import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearDomiciliosDeZona } from "./application/crearDomiciliosDeZona";
import { type CalleId, comoZonaId, type LugarId, type ZonaId } from "./domain";
import { callesDeZonas, domicilios, zonas } from "./infrastructure/esquema";
import { repositorioDeCallesDeZonasSql } from "./infrastructure/repositorioDeCallesDeZonasSql";
import {
  contextoDe,
  crearCalle,
  crearDomicilioEnCalle,
  crearLugar,
} from "./lugarDePrueba";

const domiciliosDeZona = crearDomiciliosDeZona(repositorioDeCallesDeZonasSql);

beforeAll(async () => {
  await sembrar();
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const crearZona = async (lugarId: LugarId, nombre: string): Promise<ZonaId> => {
  const [zona] = await withTenant(motul, (tx) =>
    tx
      .insert(zonas)
      .values({ ayuntamientoId: motul, lugarId, nombre })
      .returning({ id: zonas.id }),
  );
  if (!zona) throw new Error("La zona de prueba no fue creada.");
  return comoZonaId(zona.id);
};

const vincularCalle = async (
  zonaId: ZonaId,
  calleId: CalleId,
  lugarId: LugarId,
) =>
  withTenant(motul, (tx) =>
    tx.insert(callesDeZonas).values({
      ayuntamientoId: motul,
      zonaId,
      calleId,
      lugarId,
    }),
  );

describe("domiciliosDeZona", () => {
  it("deriva domicilios de la calle principal y excluye las transversales", async () => {
    const lugarId = await crearLugar("comisaria", "Zona de domicilios");
    const callePrincipalId = await crearCalle(lugarId, "Calle principal");
    const calleDelDomicilio = await crearCalle(lugarId, "Calle del domicilio");
    const zonaId = await crearZona(lugarId, "Zona principal");
    await vincularCalle(zonaId, callePrincipalId, lugarId);

    const domicilioIncluido = await crearDomicilioEnCalle(
      lugarId,
      callePrincipalId,
      "1",
    );
    const [domicilioTransversal] = await withTenant(motul, (tx) =>
      tx
        .insert(domicilios)
        .values({
          ayuntamientoId: motul,
          lugarId,
          calleId: calleDelDomicilio,
          entreCalleAId: callePrincipalId,
        })
        .returning({ id: domicilios.id }),
    );

    const resultado = await domiciliosDeZona(zonaId, contextoDe());

    expect(resultado.map((domicilio) => domicilio.id)).toEqual([
      domicilioIncluido,
    ]);
    expect(resultado.map((domicilio) => domicilio.id)).not.toContain(
      domicilioTransversal?.id,
    );
  });

  it("permite que una calle pertenezca a dos zonas", async () => {
    const lugarId = await crearLugar("comisaria", "Dos zonas");
    const calleId = await crearCalle(lugarId, "Calle compartida");
    const zonaAId = await crearZona(lugarId, "Zona A");
    const zonaBId = await crearZona(lugarId, "Zona B");

    await vincularCalle(zonaAId, calleId, lugarId);
    await vincularCalle(zonaBId, calleId, lugarId);

    const pertenencias = await withTenant(motul, (tx) =>
      tx
        .select({ zonaId: callesDeZonas.zonaId })
        .from(callesDeZonas)
        .where(eq(callesDeZonas.calleId, calleId)),
    );

    expect(pertenencias.map((fila) => fila.zonaId)).toEqual(
      expect.arrayContaining([zonaAId, zonaBId]),
    );
  });

  it("devuelve una lista vacia para una zona sin calles", async () => {
    const lugarId = await crearLugar("comisaria", "Zona vacia");
    const zonaId = await crearZona(lugarId, "Zona sin calles");

    await expect(domiciliosDeZona(zonaId, contextoDe())).resolves.toEqual([]);
  });
});
