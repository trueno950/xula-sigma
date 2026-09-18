import { describe, expect, it } from "vitest";
import type { NodoDeSubarbol } from "../application/puertos";
import { comoCalleId, comoDomicilioId, comoLugarId } from "../domain";
import {
  cuentasDeLugar,
  domiciliosDirectosDe,
  hermanosDeDireccion,
} from "./contenido";

const cabeceraId = comoLugarId("11111111-1111-4111-8111-111111111111");
const coloniaId = comoLugarId("22222222-2222-4222-8222-222222222222");
const manzanaId = comoLugarId("88888888-8888-4888-8888-888888888888");
const calleId = comoCalleId("33333333-3333-4333-8333-333333333333");
const otraCalleId = comoCalleId("44444444-4444-4444-8444-444444444444");

type NodoDomicilio = Extract<NodoDeSubarbol, { clase: "domicilio" }>;

const nodoDomicilio = (
  id: string,
  lugarId: typeof coloniaId,
  resto: Partial<NodoDomicilio> = {},
): NodoDomicilio => ({
  clase: "domicilio",
  id: comoDomicilioId(id),
  lugarId,
  calleId,
  calle: "Calle 21",
  numero: "5",
  ...resto,
});

const enColonia = nodoDomicilio(
  "55555555-5555-4555-8555-555555555555",
  coloniaId,
);
const hermano = nodoDomicilio(
  "66666666-6666-4666-8666-666666666666",
  coloniaId,
);
const enManzana = nodoDomicilio(
  "77777777-7777-4777-8777-777777777777",
  manzanaId,
  { numero: "9" },
);

const nodos: readonly NodoDeSubarbol[] = [
  {
    clase: "lugar",
    id: coloniaId,
    tipo: "colonia",
    nombre: "Centro",
    padreId: cabeceraId,
  },
  {
    clase: "lugar",
    id: manzanaId,
    tipo: "manzana",
    nombre: "Manzana 3",
    padreId: coloniaId,
  },
  enColonia,
  hermano,
  enManzana,
];

const colonia = { id: coloniaId, tipo: "colonia", nombre: "Centro" } as const;

describe("cuentasDeLugar", () => {
  it("cuenta las calles del asentamiento en un nivel inferior", () => {
    const cuentas = cuentasDeLugar({
      nodos: [],
      calles: [{ id: comoCalleId("22222222-2222-4222-8222-222222222222") }],
      nodo: colonia,
    });

    expect(cuentas.calles).toBe(1);
  });

  /**
   * El conteo sale del subarbol que la pagina ya trae: `page.tsx` dejo de
   * cargar el listado plano del municipio (A1b-GREEN-03).
   */
  it("cuenta solo los domicilios colgados de ese nodo, no los del subarbol", () => {
    const cuentas = cuentasDeLugar({ nodos, calles: [], nodo: colonia });

    expect(cuentas.domicilios).toBe(2);
  });

  it("cuenta los lugares hijos directos", () => {
    const cuentas = cuentasDeLugar({ nodos, calles: [], nodo: colonia });

    expect(cuentas.lugares).toBe(1);
  });
});

describe("domiciliosDirectosDe", () => {
  it("devuelve solo los domicilios colgados de ese lugar", () => {
    expect(domiciliosDirectosDe(nodos, coloniaId)).toEqual([
      enColonia,
      hermano,
    ]);
  });

  it("trae la calle y el numero de cada nodo, sin el listado del municipio", () => {
    const [primero] = domiciliosDirectosDe(nodos, coloniaId);

    expect(primero).toMatchObject({ calle: "Calle 21", calleId, numero: "5" });
  });

  it("sin domicilios colgados devuelve vacio", () => {
    expect(domiciliosDirectosDe(nodos, cabeceraId)).toEqual([]);
  });
});

describe("hermanosDeDireccion", () => {
  const seleccionado = { id: enColonia.id, calleId, numero: "5" };

  it("encuentra los otros domicilios con la misma calle y el mismo numero", () => {
    expect(hermanosDeDireccion(nodos, seleccionado)).toEqual([hermano]);
  });

  it("no se cuenta a si mismo", () => {
    expect(hermanosDeDireccion(nodos, seleccionado)).not.toContainEqual(
      enColonia,
    );
  });

  it("un numero distinto no es la misma direccion", () => {
    const conOtroNumero = nodoDomicilio(
      "99999999-9999-4999-8999-999999999999",
      coloniaId,
      { numero: "7" },
    );

    expect(
      hermanosDeDireccion([...nodos, conOtroNumero], seleccionado),
    ).toEqual([hermano]);
  });

  it("una calle distinta no es la misma direccion, aunque se llame igual", () => {
    const enOtraCalle = nodoDomicilio(
      "99999999-9999-4999-8999-999999999999",
      coloniaId,
      { calleId: otraCalleId },
    );

    expect(hermanosDeDireccion([...nodos, enOtraCalle], seleccionado)).toEqual([
      hermano,
    ]);
  });

  it("sin numero no hay direccion que comparar", () => {
    expect(
      hermanosDeDireccion(nodos, { ...seleccionado, numero: null }),
    ).toEqual([]);
  });

  /**
   * Los hermanos salen del subarbol que la pagina ya trae. Todo domicilio
   * de una calle cuelga del subarbol del asentamiento de esa calle
   * (`verificacionDeDomicilio.ts`, `exigirCallesDelAsentamiento`), que es
   * el subarbol que la pantalla carga.
   */
  it("no alcanza a un domicilio fuera del subarbol cargado", () => {
    expect(hermanosDeDireccion([enColonia], seleccionado)).toEqual([]);
  });
});
