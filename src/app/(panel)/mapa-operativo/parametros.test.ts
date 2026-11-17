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
    "la copia local de %s conserva el catalogo de su modulo",
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

  it("sin parametros, todo cae a undefined y el panel arranca en el mapa", () => {
    const parametros = leerParametrosDeMapa({});

    expect(parametros).toEqual({
      tipo: undefined,
      estado: undefined,
      area: undefined,
      lugar: undefined,
      panel: "en-el-mapa",
    });
  });
});

/**
 * S4: la pestana elegida viaja en la URL. Sin JavaScript es la unica forma de
 * cambiar de lista, asi que un valor invalido no puede tirar la pantalla: cae
 * al panel del mapa y los filtros siguen vigentes.
 */
describe("leerParametrosDeMapa: pestana del panel", () => {
  it("acepta la pestana de lo que no se puede dibujar", () => {
    expect(leerParametrosDeMapa({ panel: "sin-ubicar" }).panel).toBe(
      "sin-ubicar",
    );
  });

  it("un panel inventado cae al mapa sin romper el resto", () => {
    const parametros = leerParametrosDeMapa({
      panel: "otro",
      estado: "RECIBIDO",
    });

    expect(parametros.panel).toBe("en-el-mapa");
    expect(parametros.estado).toBe("RECIBIDO");
  });

  it("panel=a&panel=b (string[]) cae al mapa", () => {
    expect(
      leerParametrosDeMapa({ panel: ["sin-ubicar", "en-el-mapa"] }).panel,
    ).toBe("en-el-mapa");
  });
});

describe("leerParametrosDeMapa: territorio elegido", () => {
  const LUGAR = "22222222-2222-4222-8222-222222222222";

  it("un lugar con forma de uuid se conserva", () => {
    expect(leerParametrosDeMapa({ lugar: LUGAR }).lugar).toBe(LUGAR);
  });

  it("un lugar que no es uuid cae a undefined sin romper los otros filtros", () => {
    const parametros = leerParametrosDeMapa({
      lugar: "donde-sea",
      estado: "RECIBIDO",
    });

    expect(parametros.lugar).toBeUndefined();
    expect(parametros.estado).toBe("RECIBIDO");
  });

  it("lugar=a&lugar=b (string[]) cae a undefined", () => {
    expect(
      leerParametrosDeMapa({ lugar: [LUGAR, LUGAR] }).lugar,
    ).toBeUndefined();
  });
});
