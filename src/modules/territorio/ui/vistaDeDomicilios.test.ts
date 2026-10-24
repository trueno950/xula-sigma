import { describe, expect, it } from "vitest";
import { comoCalleId, comoLugarId } from "../domain";
import {
  caminoDeLugar,
  etiquetaDeCamino,
  type LugarConPadre,
  opcionesDeCallesDelMunicipio,
  opcionesDeNivel,
} from "./vistaDeDomicilios";
import { zonaDelFormulario } from "./zonaDelFormulario";

const motulId = comoLugarId("11111111-1111-4111-8111-111111111111");
const tepakanId = comoLugarId("22222222-2222-4222-8222-222222222222");
const coloniaId = comoLugarId("33333333-3333-4333-8333-333333333333");
const otraColoniaId = comoLugarId("44444444-4444-4444-8444-444444444444");

const lugares: readonly LugarConPadre[] = [
  { id: motulId, tipo: "cabecera", nombre: "Motul", padreId: null },
  { id: tepakanId, tipo: "comisaria", nombre: "Tepakan", padreId: null },
  { id: coloniaId, tipo: "colonia", nombre: "Pablo", padreId: tepakanId },
  {
    id: otraColoniaId,
    tipo: "colonia",
    nombre: "San Pedro",
    padreId: tepakanId,
  },
];

const tepakan = { id: tepakanId, nombre: "Tepakan" };

describe("caminoDeLugar", () => {
  it("incluye el asentamiento y los ancestros, del mas alto al padre", () => {
    // Con dos niveles, el unico ancestro de una colonia es su asentamiento.
    expect(caminoDeLugar(lugares, otraColoniaId)).toEqual(["Tepakan"]);
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
      "San Pedro — Tepakan",
    ]);
  });

  it("sin el asentamiento en la lista, el camino arranca donde se conoce", () => {
    const sinAsentamiento = lugares.filter((lugar) => lugar.id !== tepakanId);

    expect(
      opcionesDeNivel(sinAsentamiento, tepakan).map(({ etiqueta }) => etiqueta),
    ).toEqual(["Pablo — Tepakan", "San Pedro — Tepakan"]);
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

    expect(zona.marcador).toBe("Sin colonia: Tepakan");
    expect(zona.inicial).toBe("");
    expect(zona.sinZonas).toBe(false);
    expect(zona.resumen).toBe(
      "Sin elegir colonia, se guarda en el asentamiento de la calle.",
    );
  });

  it("con prefill el resumen nombra la cadena del default", () => {
    const zona = zonaDelFormulario(lugares, tepakan, {
      id: otraColoniaId,
      tipo: "colonia",
    });

    expect(zona.inicial).toBe(otraColoniaId);
    expect(zona.resumen).toBe(
      "Sin cambiar la colonia, se guarda en Colonia San Pedro · Tepakan.",
    );
  });

  it("en la raiz no hay prefill ni asentamiento: el mismo default", () => {
    const zona = zonaDelFormulario(lugares, undefined, undefined);

    expect(zona.marcador).toBe("Sin colonia");
    expect(zona.inicial).toBe("");
    expect(zona.resumen).toBe(
      "Sin elegir colonia, se guarda en el asentamiento de la calle.",
    );
  });

  /**
   * La entrada del municipio ofrece el alta sin zonas cargadas cuando nadie
   * creo una todavia, y el `<select>` de Colonia salia con el marcador solo:
   * un control vacio que la operadora no puede distinguir de uno roto. Con
   * `sinZonas` el campo lo dice y nombra la salida en vez de mentir.
   */
  it("sin ninguna zona en el municipio el campo lo dice en vez de quedar vacio", () => {
    const soloAsentamientos = lugares.filter((lugar) => lugar.padreId === null);

    const zona = zonaDelFormulario(soloAsentamientos, undefined, undefined);

    expect(zona.opciones).toEqual([]);
    expect(zona.sinZonas).toBe(true);
    expect(zona.marcador).toBe("Sin colonias registradas");
    expect(zona.resumen).toBe(
      "Todavía no hay colonias en el municipio: el domicilio se guarda en el asentamiento de la calle. Cree una colonia dentro del asentamiento para poder elegirla.",
    );
  });

  it("con una sola zona el campo vuelve a ofrecerse normal", () => {
    const zona = zonaDelFormulario(
      lugares.filter((lugar) => lugar.id === otraColoniaId),
      undefined,
      undefined,
    );

    expect(zona.sinZonas).toBe(false);
    expect(zona.marcador).toBe("Sin colonia");
  });
});
