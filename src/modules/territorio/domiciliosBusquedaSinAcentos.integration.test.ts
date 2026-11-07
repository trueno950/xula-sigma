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
 * El `?q=` de Domicilios -la pestana del lugar y `/territorio/domicilios`-
 * compara como el buscador de Calles (`shared/lib/textoDeBusqueda.ts`): sin
 * mayusculas ni acentos, con la enie como letra propia.
 */
let cabecera: Awaited<ReturnType<typeof crearLugar>>;

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

const pedir = (filtros: FiltrosDeRegistro) =>
  withTenant(motul, (tx) => registroDeDomicilios({ tx, filtros, limite: 50 }));

const idsDe = (domicilios: readonly { readonly id: string }[]) =>
  domicilios.map((domicilio) => domicilio.id);

describe("la busqueda de domicilios ignora mayusculas y acentos", () => {
  it("«Jose» encuentra la calle «José»", async () => {
    const colonia = await crearLugar("colonia", "Acentos", cabecera);
    const calle = await crearCalle(colonia, "Calle José Pérez");
    const domicilio = await crearDomicilioEnCalle(colonia, calle, "1");

    const resultado = await pedir({ raizId: colonia, busqueda: "Jose" });

    expect(idsDe(resultado.domicilios)).toEqual([domicilio]);
  });

  it("«jose» encuentra la calle «JOSÉ»", async () => {
    const colonia = await crearLugar("colonia", "Mayusculas", cabecera);
    const calle = await crearCalle(colonia, "AVENIDA JOSÉ");
    const domicilio = await crearDomicilioEnCalle(colonia, calle, "1");

    const resultado = await pedir({ raizId: colonia, busqueda: "jose" });

    expect(idsDe(resultado.domicilios)).toEqual([domicilio]);
  });

  it("el acento escrito por el operador tampoco cuenta, y vale para el nombre del lugar", async () => {
    const colonia = await crearLugar("colonia", "Jesus Carranza", cabecera);
    const calle = await crearCalle(colonia, "Calle 8");
    const domicilio = await crearDomicilioEnCalle(colonia, calle, "1");

    const resultado = await pedir({ raizId: colonia, busqueda: "JESÚS" });

    expect(idsDe(resultado.domicilios)).toEqual([domicilio]);
  });

  it("la enie no es una n: «pena» no encuentra «Peña»", async () => {
    const colonia = await crearLugar("colonia", "Enies", cabecera);
    const calle = await crearCalle(colonia, "Calle Peña");
    const domicilio = await crearDomicilioEnCalle(colonia, calle, "1");

    const sinEnie = await pedir({ raizId: colonia, busqueda: "pena" });
    const conEnie = await pedir({ raizId: colonia, busqueda: "PEÑA" });

    expect(sinEnie.domicilios).toEqual([]);
    expect(idsDe(conEnie.domicilios)).toEqual([domicilio]);
  });

  it("los comodines de LIKE siguen siendo texto", async () => {
    const colonia = await crearLugar("colonia", "Comodines", cabecera);
    const conGuionBajo = await crearCalle(colonia, "Calle 20_Á");
    const conBe = await crearCalle(colonia, "Calle 20BA");
    const conPorcentaje = await crearCalle(colonia, "Calle 9%");
    const conNueve = await crearCalle(colonia, "Calle 9 Norte");
    const enGuionBajo = await crearDomicilioEnCalle(colonia, conGuionBajo, "1");
    await crearDomicilioEnCalle(colonia, conBe, "1");
    const enPorcentaje = await crearDomicilioEnCalle(
      colonia,
      conPorcentaje,
      "1",
    );
    await crearDomicilioEnCalle(colonia, conNueve, "1");

    const guionBajo = await pedir({ raizId: colonia, busqueda: "20_a" });
    const porcentaje = await pedir({ raizId: colonia, busqueda: "9%" });

    expect(idsDe(guionBajo.domicilios)).toEqual([enGuionBajo]);
    expect(idsDe(porcentaje.domicilios)).toEqual([enPorcentaje]);
  });

  it("la busqueda no alcanza los domicilios de otro municipio", async () => {
    const cabeceraDeTicul = await crearLugarEn(ticul, "cabecera", "Cabecera");
    const calleDeTicul = await crearCalleEn(
      ticul,
      cabeceraDeTicul,
      "Calle Josefa Ortíz",
    );
    const ajeno = await crearDomicilioEnCalleEn(
      ticul,
      cabeceraDeTicul,
      calleDeTicul,
    );

    const resultado = await pedir({ busqueda: "josefa ortiz" });

    expect(idsDe(resultado.domicilios)).not.toContain(ajeno);
    expect(resultado.domicilios).toEqual([]);
  });
});
