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
import { comoLugarId } from "./domain";
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
 * Una sola cabecera para todo el archivo: `lugares_una_cabecera` admite una
 * por municipio. Cada prueba cuelga su propia colonia con nombre propio y
 * filtra por ella, asi que el arbol de una no alcanza al de la otra.
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

const pedir = (filtros: FiltrosDeRegistro, limite: number) =>
  withTenant(motul, (tx) => registroDeDomicilios({ tx, filtros, limite }));

const idsDe = (domicilios: readonly { readonly id: string }[]) =>
  domicilios.map((domicilio) => domicilio.id);

describe("registroDeDomicilios", () => {
  it("filtra por nombre de calle y deja fuera a las demas", async () => {
    const colonia = await crearLugar("colonia", "Centro", cabecera);
    const calle20 = await crearCalle(colonia, "Calle 20");
    const calle22 = await crearCalle(colonia, "Calle 22");
    const enCalle20 = await crearDomicilioEnCalle(colonia, calle20, "1");
    await crearDomicilioEnCalle(colonia, calle22, "1");

    const resultado = await pedir({ raizId: colonia, calle: "20" }, 10);

    expect(idsDe(resultado.domicilios)).toEqual([enCalle20]);
  });

  it("el subarbol de la raiz deja fuera a otro asentamiento", async () => {
    const comisaria = await crearLugar("comisaria", "Kanasin");
    const colonia = await crearLugar("colonia", "Union", comisaria);
    const ajena = await crearLugar("comisaria", "Tixkokob");
    const callePropia = await crearCalle(colonia, "Calle 20");
    const calleAjena = await crearCalle(ajena, "Calle 20");
    const propio = await crearDomicilioEnCalle(colonia, callePropia, "1");
    const ajeno = await crearDomicilioEnCalle(ajena, calleAjena, "1");

    const resultado = await pedir({ raizId: comisaria, calle: "20" }, 10);

    expect(idsDe(resultado.domicilios)).toEqual([propio]);
    expect(idsDe(resultado.domicilios)).not.toContain(ajeno);
  });

  it("escapa los comodines del filtro de calle para tratarlos como texto", async () => {
    const colonia = await crearLugar("colonia", "Comodines", cabecera);
    const conGuionBajo = await crearCalle(colonia, "Calle 20_A");
    const conBe = await crearCalle(colonia, "Calle 20BA");
    const enConGuionBajo = await crearDomicilioEnCalle(
      colonia,
      conGuionBajo,
      "1",
    );
    await crearDomicilioEnCalle(colonia, conBe, "1");

    const resultado = await pedir({ raizId: colonia, calle: "20_A" }, 10);

    expect(idsDe(resultado.domicilios)).toEqual([enConGuionBajo]);
  });

  it("el numero se compara recortado y completo, no por prefijo", async () => {
    const colonia = await crearLugar("colonia", "Numeros", cabecera);
    const calle = await crearCalle(colonia, "Calle 20");
    const numeroCinco = await crearDomicilioEnCalle(colonia, calle, "5");
    await crearDomicilioEnCalle(colonia, calle, "50");

    const resultado = await pedir({ raizId: colonia, numero: "  5  " }, 10);

    expect(idsDe(resultado.domicilios)).toEqual([numeroCinco]);
  });

  it("ampliar el limite conserva el prefijo, sin repetir ni perder filas", async () => {
    const colonia = await crearLugar("colonia", "Paginado", cabecera);
    const calle = await crearCalle(colonia, "Calle 20");
    for (const numero of ["1", "2", "3", "4"]) {
      await crearDomicilioEnCalle(colonia, calle, numero);
    }

    const primera = await pedir({ raizId: colonia }, 2);
    const ampliada = await pedir({ raizId: colonia }, 4);

    expect(primera.hayMas).toBe(true);
    expect(idsDe(ampliada.domicilios).slice(0, 2)).toEqual(
      idsDe(primera.domicilios),
    );
    expect(new Set(idsDe(ampliada.domicilios)).size).toBe(4);
    expect(ampliada.hayMas).toBe(false);
  });

  it("no devuelve mas filas que el limite pedido", async () => {
    const colonia = await crearLugar("colonia", "Limite", cabecera);
    const calle = await crearCalle(colonia, "Calle 20");
    for (const numero of ["1", "2", "3"]) {
      await crearDomicilioEnCalle(colonia, calle, numero);
    }

    const resultado = await pedir({ raizId: colonia }, 1);

    expect(resultado.domicilios).toHaveLength(1);
    expect(resultado.hayMas).toBe(true);
  });

  it("no deja ver los domicilios de otro municipio", async () => {
    const coloniaDeMotul = await crearLugar("colonia", "Aislamiento", cabecera);
    const calleDeMotul = await crearCalle(coloniaDeMotul, "Calle Aislada");
    const propio = await crearDomicilioEnCalle(
      coloniaDeMotul,
      calleDeMotul,
      "1",
    );

    const cabeceraDeTicul = await crearLugarEn(ticul, "cabecera", "Cabecera");
    const calleDeTicul = await crearCalleEn(
      ticul,
      cabeceraDeTicul,
      "Calle Aislada",
    );
    const ajeno = await crearDomicilioEnCalleEn(
      ticul,
      cabeceraDeTicul,
      calleDeTicul,
    );

    const resultado = await pedir({ calle: "Calle Aislada" }, 10);

    expect(idsDe(resultado.domicilios)).toContain(propio);
    expect(idsDe(resultado.domicilios)).not.toContain(ajeno);
  });

  /**
   * La fila trae su propio asentamiento porque el registro sin filtro no
   * tiene `?raiz=` en la URL, y esa es la pantalla desde la que se entra a
   * buscar un domicilio: sin este dato la fila no podia ofrecer su enlace.
   */
  it("sin filtro cada fila trae la raiz de su lugar, aunque cuelgue de una manzana", async () => {
    const colonia = await crearLugar("colonia", "ConRaiz", cabecera);
    const sector = await crearLugar("sector", "Sector 3", colonia);
    const manzana = await crearLugar("manzana", "Manzana 4", sector);
    const calle = await crearCalle(manzana, "Calle Raiz");
    const domicilio = await crearDomicilioEnCalle(manzana, calle, "1");

    const resultado = await pedir({ calle: "Calle Raiz" }, 10);
    const fila = resultado.domicilios.find(({ id }) => id === domicilio);

    expect(fila?.lugarId).toBe(manzana);
    expect(fila?.raizId).toBe(cabecera);
  });

  /**
   * El comentario de `registroDeDomiciliosSql` afirma que una raiz
   * inexistente deja el resultado vacio en vez de degradarse a todo el
   * municipio. Eso es una propiedad de seguridad y `AGENTS.md` pide el test
   * que la sostenga, no solo el comentario.
   */
  it("una raiz inexistente no degrada a devolver todo el municipio", async () => {
    const colonia = await crearLugar("colonia", "Existente", cabecera);
    const calle = await crearCalle(colonia, "Calle 20");
    await crearDomicilioEnCalle(colonia, calle, "1");

    const inexistente = comoLugarId("99999999-9999-4999-8999-999999999999");
    const resultado = await pedir({ raizId: inexistente }, 10);

    expect(resultado.domicilios).toEqual([]);
    expect(resultado.hayMas).toBe(false);
  });
});
