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
 * El conteo de S10 contra Postgres: `coincidencias` son las filas que dejan
 * los filtros y `total` el municipio entero, y RLS acota los dos. Vive
 * aparte de `registroDeDomicilios.integration.test.ts`, que ya esta en el
 * tope de 200 lineas de `AGENTS.md`.
 */
let cabecera: Awaited<ReturnType<typeof crearLugar>>;

beforeAll(async () => {
  await sembrar();
  cabecera = await crearLugar("cabecera", "Cabecera del conteo");
});

afterAll(async () => {
  await limpiar();
  await owner.end();
  await cerrarConexion();
});

const registroDeDomicilios = crearRegistroDeDomicilios(
  repositorioDeDomiciliosSql,
);

const pedir = (filtros: FiltrosDeRegistro, limite = 10) =>
  withTenant(motul, (tx) => registroDeDomicilios({ tx, filtros, limite }));

describe("registroDeDomicilios: el conteo", () => {
  /**
   * La linea de conteo de S10 dice «5 de 9»: las coincidencias bajan con los
   * filtros y el total es el municipio entero, que no cambia con la busqueda.
   */
  it("cuenta las coincidencias con los filtros y el total sin ellos", async () => {
    const colonia = await crearLugar("colonia", "Conteo", cabecera);
    const propia = await crearCalle(colonia, "Calle Conteo Propia");
    const otra = await crearCalle(colonia, "Calle Conteo Otra");
    await crearDomicilioEnCalle(colonia, propia, "1");
    await crearDomicilioEnCalle(colonia, otra, "2");

    const todas = await pedir({}, 10);
    const conCalle = await pedir({ calle: "Calle Conteo Propia" }, 10);

    expect(todas.coincidencias).toBe(todas.total);
    expect(conCalle.coincidencias).toBe(1);
    expect(conCalle.total).toBe(todas.total);
  });

  it("el vacio por un asentamiento ajeno deja el total del municipio en pie", async () => {
    const colonia = await crearLugar("colonia", "ConteoVacio", cabecera);
    const calle = await crearCalle(colonia, "Calle Conteo Vacia");
    await crearDomicilioEnCalle(colonia, calle, "1");
    const antes = await pedir({}, 10);

    const ajeno = await pedir(
      { raizId: comoLugarId("99999999-9999-4999-8999-999999999999") },
      10,
    );

    expect(ajeno.coincidencias).toBe(0);
    expect(ajeno.total).toBe(antes.total);
  });

  /**
   * El conteo es una lectura mas del municipio: si contara filas de otro
   * tenant, la linea de conteo publicaria cuantos domicilios tiene Ticul
   * desde la sesion de Motul.
   */
  it("el conteo no ve los domicilios de otro municipio", async () => {
    const antes = await pedir({}, 10);

    const comisariaDeTicul = await crearLugarEn(
      ticul,
      "comisaria",
      "Conteo Ajeno",
    );
    const calleDeTicul = await crearCalleEn(
      ticul,
      comisariaDeTicul,
      "Calle Conteo Ajena",
    );
    await crearDomicilioEnCalleEn(ticul, comisariaDeTicul, calleDeTicul);

    const despues = await pedir({}, 10);
    const ajenos = await pedir({ calle: "Calle Conteo Ajena" }, 10);
    const enTicul = await withTenant(ticul, (tx) =>
      registroDeDomicilios({
        tx,
        filtros: { calle: "Calle Conteo Ajena" },
        limite: 10,
      }),
    );

    expect(despues.total).toBe(antes.total);
    expect(ajenos.coincidencias).toBe(0);
    expect(enTicul.coincidencias).toBe(1);
  });
});
