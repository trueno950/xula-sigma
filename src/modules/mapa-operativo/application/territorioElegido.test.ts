import { describe, expect, it } from "vitest";
import { comoIdDeIntervencionEnMapa, comoIdDeReporteEnMapa } from "../domain";
import type { Hecho } from "./filtrarHechos";
import type { CalleParaMapaOperativo } from "./puertos";
import { filtrarPorTerritorio, lugarDelHecho } from "./territorioElegido";

const CABECERA = "cabecera";
const COMISARIA = "comisaria";
const OTRA_COMISARIA = "otra-comisaria";

const CALLE_SIN_PUNTO = "calle-sin-punto";

const calleDe = (
  id: string,
  lugarId: string,
  punto: CalleParaMapaOperativo["punto"] = { latitud: 20.9, longitud: -89.6 },
): CalleParaMapaOperativo => ({ id, nombre: `Calle ${id}`, lugarId, punto });

const puntos: ReadonlyMap<string, CalleParaMapaOperativo> = new Map(
  [
    calleDe("calle-cabecera", CABECERA),
    calleDe("calle-comisaria", COMISARIA),
    calleDe("calle-otra", OTRA_COMISARIA),
    calleDe(CALLE_SIN_PUNTO, OTRA_COMISARIA, null),
  ].map((calle) => [calle.id, calle]),
);

const reporte = (calleId: string | null, lugarId: string): Hecho => ({
  recurso: "REPORTE",
  id: comoIdDeReporteEnMapa(`reporte-${calleId ?? lugarId}`),
  calleId,
  lugarId,
  etiqueta: "REP-1",
  tipo: "BACHE",
  estado: "RECIBIDO",
  diasDeAtraso: null,
  fechaCivil: "2026-11-16",
});

const intervencion = (calleId: string | null, lugarId: string): Hecho => ({
  recurso: "INTERVENCION",
  id: comoIdDeIntervencionEnMapa(`intervencion-${calleId ?? lugarId}`),
  calleId,
  lugarId,
  etiqueta: "Obra",
  tipo: "OBRA",
  estado: "PLANIFICADA",
  diasDeAtraso: null,
  fechaCivil: "2026-01-15",
});

/**
 * El criterio de pertenencia que S1 deja abierto y este test fija: manda el
 * lugar de la calle, porque el mapa dibuja el punto de la calle -un hecho
 * cuyo lugar propio quedo en la cabecera pero cuya calle vive en la
 * comisaria elegida tiene que verse ahi, dentro de la caja-. Solo un hecho
 * sin calle se ubica por su propio lugar.
 */
describe("lugarDelHecho", () => {
  it("usa el lugar de la calle por encima del lugar propio del hecho", () => {
    expect(lugarDelHecho(reporte("calle-comisaria", CABECERA), puntos)).toBe(
      COMISARIA,
    );
  });

  it("sin calle, cae al lugar del hecho", () => {
    expect(lugarDelHecho(intervencion(null, COMISARIA), puntos)).toBe(
      COMISARIA,
    );
  });

  it("una calle sin punto igual decide por su lugar, no por el del hecho", () => {
    expect(lugarDelHecho(reporte(CALLE_SIN_PUNTO, CABECERA), puntos)).toBe(
      OTRA_COMISARIA,
    );
  });

  it("con una calle que no esta en el municipio, cae al lugar del hecho", () => {
    expect(lugarDelHecho(reporte("calle-ajena", CABECERA), puntos)).toBe(
      CABECERA,
    );
  });
});

describe("filtrarPorTerritorio", () => {
  it("sin territorio elegido no filtra nada", () => {
    const hechos = [
      reporte("calle-cabecera", CABECERA),
      reporte("calle-comisaria", COMISARIA),
    ];

    expect(filtrarPorTerritorio(hechos, puntos, null)).toHaveLength(2);
  });

  it("se queda con los hechos del subarbol elegido y deja fuera al resto", () => {
    const hechos = [
      reporte("calle-cabecera", CABECERA),
      reporte("calle-comisaria", COMISARIA),
      intervencion(null, OTRA_COMISARIA),
    ];

    const filtrados = filtrarPorTerritorio(
      hechos,
      puntos,
      new Set([COMISARIA, "comisaria-anidada"]),
    );

    expect(filtrados).toEqual([
      expect.objectContaining({ calleId: "calle-comisaria" }),
    ]);
  });

  it("un hecho de una calle sin punto entra por el subarbol de esa calle", () => {
    const hechos = [reporte(CALLE_SIN_PUNTO, CABECERA)];

    expect(
      filtrarPorTerritorio(hechos, puntos, new Set([OTRA_COMISARIA])),
    ).toEqual(hechos);
  });

  it("un lugar que no es de este municipio no deja pasar ningun hecho", () => {
    const hechos = [
      reporte("calle-cabecera", CABECERA),
      reporte("calle-comisaria", COMISARIA),
    ];

    expect(
      filtrarPorTerritorio(hechos, puntos, new Set(["lugar-ajeno"])),
    ).toEqual([]);
  });
});
