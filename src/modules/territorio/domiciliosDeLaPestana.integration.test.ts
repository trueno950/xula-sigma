import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  limpiar,
  motul,
  owner,
  sembrar,
  ticul,
} from "@/shared/tenancy/municipiosDePrueba";
import { cerrarConexion, withTenant } from "@/shared/tenancy/withTenant";
import type { FiltrosDeRegistro } from "./application/puertosDeDomicilios";
import { crearRegistroDeDomicilios } from "./application/registroDeDomicilios";
import { crearSubarbol } from "./application/subarbol";
import type { LugarId } from "./domain";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
import { repositorioDeLugaresSql } from "./infrastructure/repositorioDeLugaresSql";
import {
  contextoDe,
  crearCalle,
  crearCalleEn,
  crearDomicilioEnCalle,
  crearDomicilioEnCalleEn,
  crearLugar,
  crearLugarEn,
} from "./lugarDePrueba";

/**
 * Las dos lecturas de la vista de un lugar que dejaron de traer todos los
 * domicilios del asentamiento en cada pestana: la pagina de la pestana
 * Domicilios (`raizId` del lugar, `?q=` y `?limite=`) y los domicilios en
 * la misma direccion del panel abierto (`calleId` y numero).
 */
let cabecera: LugarId;

beforeAll(async () => {
  await sembrar();
  cabecera = await crearLugar("cabecera", "Cabecera");
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const registroDeDomicilios = crearRegistroDeDomicilios(
  repositorioDeDomiciliosSql,
);
const subarbol = crearSubarbol(repositorioDeLugaresSql);

const pedir = (filtros: FiltrosDeRegistro, limite: number) =>
  withTenant(motul, (tx) => registroDeDomicilios({ tx, filtros, limite }));

const idsDe = (domicilios: readonly { readonly id: string }[]) =>
  domicilios.map((domicilio) => domicilio.id);

describe("la pagina de la pestana Domicilios", () => {
  it("la busqueda filtra dentro del subarbol del lugar y respeta el limite", async () => {
    const colonia = await crearLugar("colonia", "Pestana", cabecera);
    const calle20 = await crearCalle(colonia, "Calle 20");
    const calle31 = await crearCalle(colonia, "Calle 31");
    const primero = await crearDomicilioEnCalle(colonia, calle20, "1");
    const segundo = await crearDomicilioEnCalle(colonia, calle20, "2");
    await crearDomicilioEnCalle(colonia, calle31, "7");

    const pagina = await pedir({ raizId: colonia, busqueda: "20" }, 1);
    const todas = await pedir({ raizId: colonia, busqueda: "20" }, 50);

    expect(pagina.domicilios).toHaveLength(1);
    expect(pagina.hayMas).toBe(true);
    expect(new Set(idsDe(todas.domicilios))).toEqual(
      new Set([primero, segundo]),
    );
    expect(todas.hayMas).toBe(false);
  });
});

describe("la busqueda por palabras de la pestana", () => {
  it("«Calle 14 88» y «14 88» encuentran el domicilio dentro del subarbol", async () => {
    const colonia = await crearLugar("colonia", "Pestana Palabras", cabecera);
    const calle14 = await crearCalle(colonia, "Calle 14");
    const buscado = await crearDomicilioEnCalle(colonia, calle14, "88");
    await crearDomicilioEnCalle(colonia, calle14, "12");

    const conCalle = await pedir(
      { raizId: colonia, busqueda: "Calle 14 88" },
      50,
    );
    const sinCalle = await pedir({ raizId: colonia, busqueda: "14 88" }, 50);

    expect(idsDe(conCalle.domicilios)).toEqual([buscado]);
    expect(idsDe(sinCalle.domicilios)).toEqual([buscado]);
  });
});

describe("los domicilios en la misma direccion", () => {
  it("filtra por calleId: el mismo numero en otra calle del mismo nombre queda fuera", async () => {
    const colonia = await crearLugar("colonia", "Gemelas", cabecera);
    const otra = await crearLugar("colonia", "Gemelas Norte", cabecera);
    const calle = await crearCalle(colonia, "Calle 21");
    const homonima = await crearCalle(otra, "Calle 21");
    const propio = await crearDomicilioEnCalle(colonia, calle, "21");
    const hermano = await crearDomicilioEnCalle(colonia, calle, "21");
    const vecino = await crearDomicilioEnCalle(otra, homonima, "21");

    const resultado = await pedir(
      { raizId: cabecera, calleId: calle, numero: "21" },
      50,
    );

    expect(new Set(idsDe(resultado.domicilios))).toEqual(
      new Set([propio, hermano]),
    );
    expect(idsDe(resultado.domicilios)).not.toContain(vecino);
  });

  it("una calle de otro municipio no devuelve sus domicilios", async () => {
    const cabeceraDeTicul = await crearLugarEn(ticul, "cabecera", "Cabecera");
    const calleDeTicul = await crearCalleEn(ticul, cabeceraDeTicul, "Calle 9");
    await crearDomicilioEnCalleEn(ticul, cabeceraDeTicul, calleDeTicul);

    const resultado = await pedir({ calleId: calleDeTicul }, 50);

    expect(resultado.domicilios).toEqual([]);
  });
});

describe("subarbol solo de lugares", () => {
  it("trae los lugares del subarbol sin ningun domicilio", async () => {
    const colonia = await crearLugar("colonia", "SoloLugares", cabecera);
    const calle = await crearCalle(colonia, "Calle 40");
    await crearDomicilioEnCalle(colonia, calle, "1");

    const completo = await subarbol(cabecera, contextoDe());
    const soloLugares = await subarbol(cabecera, contextoDe(), {
      soloLugares: true,
    });

    expect(completo.some((nodo) => nodo.clase === "domicilio")).toBe(true);
    expect(soloLugares.every((nodo) => nodo.clase === "lugar")).toBe(true);
    expect(soloLugares.map((nodo) => nodo.id)).toContain(colonia);
  });
});
