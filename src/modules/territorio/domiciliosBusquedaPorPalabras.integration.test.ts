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
import type { DomicilioId, LugarId } from "./domain";
import { repositorioDeDomiciliosSql } from "./infrastructure/repositorioDeDomiciliosSql";
import {
  crearCalle,
  crearCalleEn,
  crearDomicilioEnCalle,
  crearDomicilioEnCalleEn,
  crearLugar,
  crearLugarEn,
} from "./lugarDePrueba";

/**
 * Hallazgo 11 de la auditoria de flujos: la operadora escribe la direccion
 * como la dice -«Calle 22 265», «Calle 22 #265»- y la busqueda pedia que
 * todo el texto apareciera junto en una sola columna. Cada palabra coincide
 * ahora por su cuenta con la calle, el numero, la colonia o el asentamiento.
 */
let colonia: LugarId;
let buscado: DomicilioId;
let vecino: DomicilioId;
let enOtraCalle: DomicilioId;

beforeAll(async () => {
  await sembrar();
  const cabecera = await crearLugar("cabecera", "Palabras");
  colonia = await crearLugar("colonia", "San Juan", cabecera);
  const calle22 = await crearCalle(colonia, "Calle 22");
  const calle31 = await crearCalle(colonia, "Calle 31");
  buscado = await crearDomicilioEnCalle(colonia, calle22, "265-A");
  vecino = await crearDomicilioEnCalle(colonia, calle22, "101");
  enOtraCalle = await crearDomicilioEnCalle(colonia, calle31, "265");
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const registroDeDomicilios = crearRegistroDeDomicilios(
  repositorioDeDomiciliosSql,
);

const idsDe = async (filtros: FiltrosDeRegistro) => {
  const resultado = await withTenant(motul, (tx) =>
    registroDeDomicilios({ tx, filtros, limite: 50 }),
  );
  return resultado.domicilios.map((domicilio) => domicilio.id);
};

const buscar = (busqueda: string) => idsDe({ raizId: colonia, busqueda });

describe("la busqueda de domicilios por palabras", () => {
  it.each(["Calle 22 265", "22 265", "Calle 22 #265", "calle 22, #265-a"])(
    "«%s» encuentra «Calle 22 #265-A» y solo ese",
    async (consulta) => {
      expect(await buscar(consulta)).toEqual([buscado]);
    },
  );

  it("«265» solo encuentra el numero en cualquier calle", async () => {
    expect(new Set(await buscar("265"))).toEqual(
      new Set([buscado, enOtraCalle]),
    );
  });

  it("«calle 22» sigue trayendo todos los domicilios de la Calle 22", async () => {
    expect(new Set(await buscar("calle 22"))).toEqual(
      new Set([buscado, vecino]),
    );
  });

  it("una palabra puede ser la colonia: «san juan 101»", async () => {
    expect(await buscar("san juan 101")).toEqual([vecino]);
  });

  it("todas las palabras tienen que coincidir: una que no esta deja la lista vacia", async () => {
    expect(await buscar("calle 22 999")).toEqual([]);
  });

  it("los signos sueltos no cuentan como palabra", async () => {
    expect(await buscar("calle 22 # , 265")).toEqual([buscado]);
  });

  it("una consulta de solo signos no devuelve el municipio entero", async () => {
    expect(await buscar("# ,")).toEqual([]);
  });

  it("las palabras de mas alla del tope no filtran", async () => {
    expect(await buscar("calle 22 265 san juan palabras 999")).toEqual([
      buscado,
    ]);
  });

  it("la busqueda por palabras no alcanza los domicilios de otro municipio", async () => {
    const cabeceraDeTicul = await crearLugarEn(ticul, "cabecera", "Ajena");
    const calleDeTicul = await crearCalleEn(
      ticul,
      cabeceraDeTicul,
      "Calle Ajena 22",
    );
    await crearDomicilioEnCalleEn(ticul, cabeceraDeTicul, calleDeTicul);

    expect(await idsDe({ busqueda: "ajena 22" })).toEqual([]);
  });
});
