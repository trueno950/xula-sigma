import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  comoCalleId,
  type HistorialDeCalle as HistorialDeCalleDeDominio,
} from "../domain";
import { LineaDeTiempoDeCalle } from "./HistorialDeCalle";

const calleId = comoCalleId("11111111-1111-4111-8111-111111111111");
const historial: HistorialDeCalleDeDominio = {
  calleId,
  estado: "CON_DATOS",
  entradas: [
    {
      id: "reporte",
      precision: "MOMENTO",
      naturaleza: "REPORTE",
      ocurridoEn: new Date("2026-03-05"),
      cambio: null,
    },
    {
      id: "intervencion",
      precision: "DIA",
      naturaleza: "INTERVENCION",
      ocurridoEn: new Date("2026-03-04"),
      cambio: null,
    },
    {
      id: "renombre",
      precision: "MOMENTO",
      naturaleza: "RENOMBRE",
      ocurridoEn: new Date("2026-03-03"),
      cambio: null,
    },
    {
      id: "reparenteo",
      precision: "MOMENTO",
      naturaleza: "REPARENTEO",
      ocurridoEn: new Date("2026-03-02"),
      cambio: null,
    },
    {
      id: "ubicacion",
      precision: "MOMENTO",
      naturaleza: "UBICACION",
      ocurridoEn: new Date("2026-03-01"),
      cambio: null,
    },
  ],
};

const historialDe = (
  entrada: HistorialDeCalleDeDominio["entradas"][number],
): HistorialDeCalleDeDominio => ({
  calleId,
  estado: "CON_DATOS",
  entradas: [entrada],
});

describe("HistorialDeCalle", () => {
  it("distingue las cinco naturalezas con icono y etiqueta", () => {
    const html = renderToStaticMarkup(
      <LineaDeTiempoDeCalle historial={historial} />,
    );

    for (const naturaleza of [
      "Reporte",
      "Intervención",
      "Renombre",
      "Reparenteo",
      "Ubicación",
    ]) {
      expect(html).toContain(naturaleza);
    }
    expect(html).toContain("svg");
    expect(html).not.toContain("movimientos_de_reportes");
    expect(html).not.toContain("bitacora");
  });

  it("muestra un estado vacio explicito sin inventar entradas", () => {
    const html = renderToStaticMarkup(
      <LineaDeTiempoDeCalle
        historial={{ calleId, estado: "VACIO", entradas: [] }}
      />,
    );

    expect(html).toContain("Esta calle todavía no tiene hechos registrados.");
    expect(html).not.toContain("<li");
  });

  it("una intervencion del 22 de septiembre muestra el dia 22 y ninguna hora", () => {
    const html = renderToStaticMarkup(
      <LineaDeTiempoDeCalle
        historial={historialDe({
          id: "intervencion",
          naturaleza: "INTERVENCION",
          precision: "DIA",
          ocurridoEn: new Date("2026-09-22T00:00:00.000Z"),
          cambio: null,
        })}
      />,
    );

    expect(html).toContain(">22 sep 2026<");
    expect(html).toContain('dateTime="2026-09-22"');
    expect(html).not.toContain("21 sep");
    expect(html).not.toMatch(/\d:\d\d/);
  });

  it("un reporte con instante real sigue mostrando fecha y hora en Merida", () => {
    const html = renderToStaticMarkup(
      <LineaDeTiempoDeCalle
        historial={historialDe({
          id: "reporte",
          naturaleza: "REPORTE",
          precision: "MOMENTO",
          ocurridoEn: new Date("2026-09-22T02:30:00.000Z"),
          cambio: null,
        })}
      />,
    );

    expect(html).toContain("21 sep 2026");
    expect(html).toContain("8:30");
    expect(html).not.toContain("22 sep");
  });
});
