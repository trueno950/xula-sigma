import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NoEncontradoError } from "@/shared/lib/errores";
import {
  limpiar,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import { crearAltaDeDomicilio } from "./application/altaDeDomicilio";
import { type CalleId, comoCalleId, comoLugarId, type LugarId } from "./domain";
import { calles, lugares } from "./infrastructure/esquema";
import { repositorioDeCallesSql } from "./infrastructure/repositorioDeCallesSql";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
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

const altaDeDomicilio = crearAltaDeDomicilio(
  repositorioDeDomiciliosSql,
  repositorioDeLugaresSql,
  repositorioDeCallesSql,
);

const altaEn = (lugarId: LugarId, calleId: CalleId) =>
  altaDeDomicilio(
    {
      lugarId,
      calleId,
      numero: "10",
      entreCalleAId: null,
      entreCalleBId: null,
      referencia: null,
    },
    contextoDe(),
  );

describe("altaDeDomicilio", () => {
  it("un domicilio sin colonia conocida, colgado directo del asentamiento, se crea correctamente", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria sin colonias");
    const colonia = await crearLugar("colonia", "Colonia sin hijos", comisaria);
    const calle = await crearCalle(comisaria, "Calle 21");

    const { id } = await altaEn(colonia, calle);

    const domicilios = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeDomiciliosSql.porLugarYSubarbol(tx, colonia),
    );

    expect(domicilios.map((d) => d.id)).toContain(id);
  });

  it("rechaza un lugarId de otro municipio como si no existiera: RLS lo esconde antes del FK", async () => {
    const [lugarDeTicul] = await withTenant(ticul, (tx) =>
      tx
        .insert(lugares)
        .values({
          ayuntamientoId: ticul,
          tipo: "comisaria",
          nombre: "Yotholin",
        })
        .returning({ id: lugares.id }),
    );
    const calle = await crearCalle(
      await crearLugar("colonia", "Colonia para lugarId ajeno"),
      "Calle 21",
    );

    await expect(
      altaEn(comoLugarId(lugarDeTicul!.id), calle),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it("rechaza un calleId de otro municipio como si no existiera: RLS lo esconde antes del FK", async () => {
    const lugarDeTicul = (
      await withTenant(ticul, (tx) =>
        tx
          .insert(lugares)
          .values({
            ayuntamientoId: ticul,
            tipo: "colonia",
            nombre: "Colonia de Ticul",
          })
          .returning({ id: lugares.id }),
      )
    )[0]!;
    const [calleDeTicul] = await withTenant(ticul, (tx) =>
      tx
        .insert(calles)
        .values({
          ayuntamientoId: ticul,
          nombre: "Calle ajena",
          lugarId: lugarDeTicul.id,
        })
        .returning({ id: calles.id }),
    );
    const comisaria = await crearLugar(
      "comisaria",
      "Comisaria para calleId ajeno",
    );
    const lugar = await crearLugar(
      "colonia",
      "Colonia para calleId ajeno",
      comisaria,
    );

    await expect(
      altaEn(lugar, comoCalleId(calleDeTicul!.id)),
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});

describe("porLugarYSubarbol", () => {
  it("los domicilios de un asentamiento incluyen el colgado directo y los de sus colonias, en una sola consulta", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria con colgado");
    const coloniaA = await crearLugar("colonia", "Colonia A", comisaria);
    const coloniaB = await crearLugar("colonia", "Colonia B", comisaria);
    const calleDelAsentamiento = await crearCalle(
      comisaria,
      "Calle del asentamiento",
    );
    const calleDeA = await crearCalle(comisaria, "Calle de A");
    const calleDeB = await crearCalle(comisaria, "Calle de B");

    const colgadoDelAsentamiento = await crearDomicilioEnCalle(
      comisaria,
      calleDelAsentamiento,
    );
    const deColoniaA = await crearDomicilioEnCalle(coloniaA, calleDeA);
    const deColoniaB = await crearDomicilioEnCalle(coloniaB, calleDeB);

    const domicilios = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeDomiciliosSql.porLugarYSubarbol(tx, comisaria),
    );

    expect(domicilios.map((d) => d.id).sort()).toEqual(
      [colgadoDelAsentamiento, deColoniaA, deColoniaB].sort(),
    );
  });

  it("un domicilio sin residentes aparece igual en la consulta por subarbol", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria sin residentes");
    const calle = await crearCalle(comisaria, "Calle desierta");
    const domicilio = await crearDomicilioEnCalle(comisaria, calle);

    const domicilios = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeDomiciliosSql.porLugarYSubarbol(tx, comisaria),
    );

    expect(domicilios.map((d) => d.id)).toContain(domicilio);
  });
});

describe("porCalle", () => {
  it("los domicilios de la Calle 21 incluyen los de todas las colonias que atraviesa", async () => {
    const comisaria = await crearLugar("comisaria", "Comisaria atravesada");
    const coloniaA = await crearLugar(
      "colonia",
      "Colonia A de Calle 21",
      comisaria,
    );
    const coloniaB = await crearLugar(
      "colonia",
      "Colonia B de Calle 21",
      comisaria,
    );
    const calle21 = await crearCalle(comisaria, "Calle 21");

    const enA = await crearDomicilioEnCalle(coloniaA, calle21);
    const enB = await crearDomicilioEnCalle(coloniaB, calle21);

    const domicilios = await withTenant(contextoDe().ayuntamientoId, (tx) =>
      repositorioDeDomiciliosSql.porCalle(tx, calle21),
    );

    expect(domicilios.map((d) => d.id).sort()).toEqual([enA, enB].sort());
  });
});
