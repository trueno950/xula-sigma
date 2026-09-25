import { describe, expect, it } from "vitest";
import {
  ESTADOS_DE_INTERVENCION,
  TIPOS_DE_INTERVENCION,
} from "@/modules/intervenciones";
import {
  AREAS_PARA_FILTRO,
  ESTADOS_DE_INTERVENCION_PARA_FILTRO,
  ESTADOS_DE_REPORTE_PARA_FILTRO,
  TIPOS_DE_INTERVENCION_PARA_FILTRO,
  TIPOS_DE_REPORTE_PARA_FILTRO,
} from "@/modules/mapa-operativo";
import {
  AREAS_RESPONSABLES,
  ESTADOS_DE_REPORTE,
  TIPOS_DE_INCIDENCIA,
} from "@/modules/reportes";
import { leerParametrosDeMapa } from "./parametros";

describe("vocabularios de filtro del mapa", () => {
  it.each([
    ["tipos de reporte", TIPOS_DE_REPORTE_PARA_FILTRO, TIPOS_DE_INCIDENCIA],
    ["estados de reporte", ESTADOS_DE_REPORTE_PARA_FILTRO, ESTADOS_DE_REPORTE],
    ["areas", AREAS_PARA_FILTRO, AREAS_RESPONSABLES],
    [
      "tipos de intervencion",
      TIPOS_DE_INTERVENCION_PARA_FILTRO,
      TIPOS_DE_INTERVENCION,
    ],
    [
      "estados de intervencion",
      ESTADOS_DE_INTERVENCION_PARA_FILTRO,
      ESTADOS_DE_INTERVENCION,
    ],
  ])(
    "la copia local de %s coincide con el catalogo de su modulo",
    (_, copia, original) => {
      expect([...copia].sort()).toEqual([...original].sort());
    },
  );
});

describe("leerParametrosDeMapa", () => {
  it("un tipo del vocabulario de reportes se conserva", () => {
    const parametros = leerParametrosDeMapa({ tipo: "BASURA" });

    expect(parametros.tipo).toBe("BASURA");
  });

  it("un tipo del vocabulario de intervenciones se conserva", () => {
    const parametros = leerParametrosDeMapa({ tipo: "OBRA" });

    expect(parametros.tipo).toBe("OBRA");
  });

  it("un tipo fuera de ambos vocabularios cae a undefined sin romper estado", () => {
    const parametros = leerParametrosDeMapa({
      tipo: "INVENTADO",
      estado: "RECIBIDO",
    });

    expect(parametros.tipo).toBeUndefined();
    expect(parametros.estado).toBe("RECIBIDO");
  });

  it("tipo=a&tipo=b (string[]) cae a undefined sin romper area", () => {
    const parametros = leerParametrosDeMapa({
      tipo: ["BACHE", "OBRA"],
      area: "OBRAS_PUBLICAS",
    });

    expect(parametros.tipo).toBeUndefined();
    expect(parametros.area).toBe("OBRAS_PUBLICAS");
  });

  it("un area fuera de la union cerrada cae a undefined", () => {
    const parametros = leerParametrosDeMapa({ area: "INVENTADA" });

    expect(parametros.area).toBeUndefined();
  });

  it("sin parametros, todo cae a undefined", () => {
    const parametros = leerParametrosDeMapa({});

    expect(parametros).toEqual({
      tipo: undefined,
      estado: undefined,
      area: undefined,
    });
  });
});
