import { describe, expect, it } from "vitest";
import { comoIdDeReporteEnMapa } from "../domain";
import { HECHO_DE_REPORTE, mapaDe, marcadorDe } from "./mapaDePrueba";
import {
  callesConHechos,
  chipsDeFiltro,
  pestanasDePanel,
  resumenDelMapa,
} from "./resumenDelMapa";

const MOTUL = { id: "raiz-1", nombre: "Motul" };

describe("chipsDeFiltro (S1)", () => {
  it("nombra cada filtro puesto con su etiqueta legible, no con su codigo", () => {
    const chips = chipsDeFiltro(
      { tipo: "BACHE", estado: "EN_EJECUCION", area: "OBRAS_PUBLICAS" },
      MOTUL,
    );

    expect(chips.map((chip) => chip.etiqueta)).toEqual([
      "Tipo: Bache",
      "Estado: En ejecución",
      "Área: Obras públicas",
    ]);
  });

  it("el chip del territorio dice su nombre y no su identificador", () => {
    const chips = chipsDeFiltro({ lugar: "raiz-1" }, MOTUL);

    expect(chips.map((chip) => chip.etiqueta)).toEqual(["Territorio: Motul"]);
  });

  it("quitar un chip deja puestos los otros filtros", () => {
    const chips = chipsDeFiltro({ tipo: "BACHE", lugar: "raiz-1" }, MOTUL);

    // El orden de los chips sigue al de la barra: territorio, tipo, estado, area.
    expect(chips[0]?.etiqueta).toBe("Territorio: Motul");
    expect(chips[0]?.hrefQuitar).toBe("/mapa-operativo?tipo=BACHE");
    expect(chips[1]?.hrefQuitar).toBe("/mapa-operativo?lugar=raiz-1");
  });

  it("sin filtros puestos no hay chips", () => {
    expect(chipsDeFiltro({}, null)).toEqual([]);
  });
});

describe("resumenDelMapa (S1)", () => {
  it("cuenta hechos, calles dibujadas, atrasados y lo que no se puede dibujar", () => {
    const mapa = mapaDe({
      marcadores: [
        marcadorDe([HECHO_DE_REPORTE], { clave: "calle-1" }),
        marcadorDe([HECHO_DE_REPORTE], { clave: "calle-2" }),
      ],
      cobertura: [
        {
          recurso: "REPORTE",
          id: comoIdDeReporteEnMapa("reporte-2"),
          etiqueta: "REP-2",
          href: "/reportes/detalle/reporte-2",
          razon: "SIN_CALLE",
          calle: null,
        },
      ],
      conteos: { reportes: 2, intervenciones: 0, total: 2 },
      leyenda: { tipos: [], estados: [], atrasados: 1, total: 2 },
      sinUbicar: [
        {
          id: MOTUL.id,
          nombre: MOTUL.nombre,
          calles: [
            { id: "calle-9", nombre: "Calle 9", href: "/territorio?calle=9" },
            { id: "calle-8", nombre: "Calle 8", href: "/territorio?calle=8" },
          ],
        },
      ],
    });

    expect(resumenDelMapa(mapa)).toEqual({
      hechos: { valor: 2, etiqueta: "hechos" },
      calles: { valor: 2, etiqueta: "calles en el mapa" },
      atrasados: { valor: 1, etiqueta: "atrasado" },
      sinUbicar: { valor: 3, etiqueta: "sin ubicar" },
      totalSinUbicar: 3,
    });
  });

  it("usa el singular cuando hay uno solo de cada cosa", () => {
    const mapa = mapaDe({
      marcadores: [marcadorDe([HECHO_DE_REPORTE])],
      conteos: { reportes: 1, intervenciones: 0, total: 1 },
    });

    expect(resumenDelMapa(mapa)).toEqual({
      hechos: { valor: 1, etiqueta: "hecho" },
      calles: { valor: 1, etiqueta: "calle en el mapa" },
      atrasados: { valor: 0, etiqueta: "atrasados" },
      sinUbicar: { valor: 0, etiqueta: "sin ubicar" },
      totalSinUbicar: 0,
    });
  });
});

describe("callesConHechos (S2)", () => {
  it("concuerda con el numero de calles dibujadas", () => {
    expect(callesConHechos(1)).toBe("1 calle con hechos");
    expect(callesConHechos(6)).toBe("6 calles con hechos");
  });
});

describe("pestanasDePanel (S4)", () => {
  it("arma las dos pestanas con su cuenta y su direccion", () => {
    const pestanas = pestanasDePanel({
      filtros: { estado: "RECIBIDO" },
      panel: "sin-ubicar",
      calles: 6,
      sinUbicar: 5,
    });

    expect(
      pestanas.map(({ etiqueta, cuenta, activa }) => [
        etiqueta,
        cuenta,
        activa,
      ]),
    ).toEqual([
      ["En el mapa", 6, false],
      ["Sin ubicar", 5, true],
    ]);
    expect(pestanas[0]?.href).toBe(
      "/mapa-operativo?estado=RECIBIDO&panel=en-el-mapa",
    );
    expect(pestanas[1]?.href).toBe(
      "/mapa-operativo?estado=RECIBIDO&panel=sin-ubicar",
    );
  });

  it("la pestana sin JavaScript se alcanza por su enlace", () => {
    const pestanas = pestanasDePanel({
      filtros: {},
      panel: "en-el-mapa",
      calles: 0,
      sinUbicar: 2,
    });

    expect(pestanas[1]?.href).toContain("panel=sin-ubicar");
  });
});
