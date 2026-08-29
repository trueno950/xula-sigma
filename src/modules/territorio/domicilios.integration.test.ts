import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { limpiar, owner, sembrar } from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAltaDeDomicilio } from "./application/altaDeDomicilio";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
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

const altaDeDomicilio = crearAltaDeDomicilio(repositorioDeDomiciliosSql);

describe("altaDeDomicilio", () => {
  it("un domicilio sin manzana conocida, colgado directo de una colonia, se crea correctamente", async () => {
    const colonia = await crearLugar("colonia", "Colonia sin manzanas");
    const calle = await crearCalle(colonia, "Calle 21");

    const { id } = await altaDeDomicilio(
      {
        lugarId: colonia,
        calleId: calle,
        numero: "10",
        entreCalleAId: null,
        entreCalleBId: null,
        referencia: null,
      },
      contextoDe(),
    );

    const domicilios = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeDomiciliosSql.porLugarYSubarbol(tx, colonia),
    );

    expect(domicilios.map((d) => d.id)).toContain(id);
  });
});

describe("porLugarYSubarbol", () => {
  it("los domicilios de un sector incluyen el colgado directo y los de sus manzanas, en una sola consulta", async () => {
    const sector = await crearLugar("sector", "Sector con colgado");
    const manzanaA = await crearLugar("manzana", "Manzana A", sector);
    const manzanaB = await crearLugar("manzana", "Manzana B", sector);
    const calleDelSector = await crearCalle(sector, "Calle del sector");
    const calleDeA = await crearCalle(manzanaA, "Calle de A");
    const calleDeB = await crearCalle(manzanaB, "Calle de B");

    const colgadoDelSector = await crearDomicilioEnCalle(
      sector,
      calleDelSector,
    );
    const deManzanaA = await crearDomicilioEnCalle(manzanaA, calleDeA);
    const deManzanaB = await crearDomicilioEnCalle(manzanaB, calleDeB);

    const domicilios = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeDomiciliosSql.porLugarYSubarbol(tx, sector),
    );

    expect(domicilios.map((d) => d.id).sort()).toEqual(
      [colgadoDelSector, deManzanaA, deManzanaB].sort(),
    );
  });

  it("un domicilio sin residentes aparece igual en la consulta por zona", async () => {
    const sector = await crearLugar("sector", "Sector sin residentes");
    const calle = await crearCalle(sector, "Calle desierta");
    const domicilio = await crearDomicilioEnCalle(sector, calle);

    const domicilios = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeDomiciliosSql.porLugarYSubarbol(tx, sector),
    );

    expect(domicilios.map((d) => d.id)).toContain(domicilio);
  });
});

describe("porCalle", () => {
  it("los domicilios de la Calle 21 incluyen los de todas las manzanas que atraviesa", async () => {
    const sector = await crearLugar("sector", "Sector atravesado");
    const manzanaA = await crearLugar(
      "manzana",
      "Manzana A de Calle 21",
      sector,
    );
    const manzanaB = await crearLugar(
      "manzana",
      "Manzana B de Calle 21",
      sector,
    );
    const calle21 = await crearCalle(manzanaA, "Calle 21");

    const enA = await crearDomicilioEnCalle(manzanaA, calle21);
    const enB = await crearDomicilioEnCalle(manzanaB, calle21);

    const domicilios = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeDomiciliosSql.porCalle(tx, calle21),
    );

    expect(domicilios.map((d) => d.id).sort()).toEqual([enA, enB].sort());
  });
});
