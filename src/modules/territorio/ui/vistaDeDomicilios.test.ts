import { describe, expect, it } from "vitest";
import { comoCalleId, comoLugarId } from "../domain";
import {
  caminoDeLugar,
  etiquetaDeCamino,
  type LugarConPadre,
  opcionesDeCallesDelMunicipio,
  opcionesDeNivel,
  zonaDelFormulario,
} from "./vistaDeDomicilios";

const motulId = comoLugarId("11111111-1111-4111-8111-111111111111");
const tepakanId = comoLugarId("22222222-2222-4222-8222-222222222222");
const coloniaId = comoLugarId("33333333-3333-4333-8333-333333333333");
const sectorId = comoLugarId("44444444-4444-4444-8444-444444444444");
const manzanaId = comoLugarId("55555555-5555-4555-8555-555555555555");

const lugares: readonly LugarConPadre[] = [
  { id: motulId, tipo: "cabecera", nombre: "Motul", padreId: null },
  { id: tepakanId, tipo: "comisaria", nombre: "Tepakan", padreId: null },
  { id: coloniaId, tipo: "colonia", nombre: "Pablo", padreId: tepakanId },
  { id: sectorId, tipo: "sector", nombre: "2", padreId: coloniaId },
  { id: manzanaId, tipo: "manzana", nombre: "San Pedro", padreId: sectorId },
];

const tepakan = { id: tepakanId, nombre: "Tepakan" };

describe("caminoDeLugar", () => {
  it("incluye el asentamiento y los ancestros, del mas alto al padre", () => {
    expect(caminoDeLugar(lugares, manzanaId)).toEqual([
      "Tepakan",
      "Pablo",
      "2",
    ]);
    expect(caminoDeLugar(lugares, coloniaId)).toEqual(["Tepakan"]);
  });

  it("el asentamiento no lleva sufijo de camino", () => {
    expect(caminoDeLugar(lugares, tepakanId)).toEqual([]);
    expect(etiquetaDeCamino("Tepakan", [])).toBe("Tepakan");
  });

  it("arma la etiqueta con el camino completo", () => {
    expect(etiquetaDeCamino("San Pedro", ["Tepakan", "Pablo", "2"])).toBe(
      "San Pedro — Tepakan › Pablo › 2",
    );
  });
});

describe("opcionesDeNivel", () => {
  it("lista solo niveles de zona, ordenados por camino", () => {
    expect(opcionesDeNivel(lugares).map(({ etiqueta }) => etiqueta)).toEqual([
      "Pablo — Tepakan",
      "2 — Tepakan › Pablo",
      "San Pedro — Tepakan › Pablo › 2",
    ]);
  });

  it("sin el asentamiento en la lista, el camino arranca donde se conoce", () => {
    const sinAsentamiento = lugares.filter((lugar) => lugar.id !== tepakanId);

    expect(
      opcionesDeNivel(sinAsentamiento, tepakan).map(({ etiqueta }) => etiqueta),
    ).toEqual([
      "Pablo — Tepakan",
      "2 — Tepakan › Pablo",
      "San Pedro — Tepakan › Pablo › 2",
    ]);
  });
});

describe("opcionesDeCallesDelMunicipio", () => {
  it("rotula cada calle con su asentamiento", () => {
    expect(
      opcionesDeCallesDelMunicipio([
        {
          id: comoCalleId("66666666-6666-4666-8666-666666666666"),
          nombre: "Calle 20",
          lugarId: tepakanId,
          punto: null,
          bajaEn: null,
          asentamiento: "Tepakan",
        },
      ]),
    ).toEqual([
      {
        valor: comoCalleId("66666666-6666-4666-8666-666666666666"),
        etiqueta: "Calle 20 — Tepakan",
      },
    ]);
  });
});

describe("zonaDelFormulario", () => {
  it("sin prefill el resumen describe el default, no la seleccion", () => {
    const zona = zonaDelFormulario(lugares, tepakan, {
      id: tepakanId,
      tipo: "comisaria",
    });

    expect(zona.marcador).toBe("Sin zona: Tepakan");
    expect(zona.inicial).toBe("");
    expect(zona.resumen).toBe(
      "Sin elegir zona, se guarda en el asentamiento de la calle.",
    );
  });

  it("con prefill el resumen nombra la cadena del default", () => {
    const zona = zonaDelFormulario(lugares, tepakan, {
      id: manzanaId,
      tipo: "manzana",
    });

    expect(zona.inicial).toBe(manzanaId);
    expect(zona.resumen).toBe(
      "Sin cambiar la zona, se guarda en Manzana San Pedro · Sector 2 · Colonia Pablo · Tepakan.",
    );
  });

  it("en la raiz no hay prefill ni asentamiento: el mismo default", () => {
    const zona = zonaDelFormulario(lugares, undefined, undefined);

    expect(zona.marcador).toBe("Sin zona");
    expect(zona.inicial).toBe("");
    expect(zona.resumen).toBe(
      "Sin elegir zona, se guarda en el asentamiento de la calle.",
    );
  });
});
