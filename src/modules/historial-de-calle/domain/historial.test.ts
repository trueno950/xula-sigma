import { describe, expect, it } from "vitest";
import { comoCalleId, componerHistorialDeCalle } from "./historial";

const calleId = comoCalleId("11111111-1111-4111-8111-111111111111");

describe("componerHistorialDeCalle: precision de cada entrada", () => {
  const historial = componerHistorialDeCalle({
    calleId,
    eventos: [
      {
        id: "renombre",
        naturaleza: "RENOMBRE",
        ocurridoEn: new Date("2026-09-20T15:00:00.000Z"),
      },
      {
        id: "reparenteo",
        naturaleza: "REPARENTEO",
        ocurridoEn: new Date("2026-09-19T15:00:00.000Z"),
      },
      {
        id: "ubicacion",
        naturaleza: "UBICACION",
        ocurridoEn: new Date("2026-09-18T15:00:00.000Z"),
      },
    ],
    reportes: [
      { id: "reporte", registradoEn: new Date("2026-09-23T02:30:00.000Z") },
    ],
    intervenciones: [{ id: "intervencion", fechaDeOcurrencia: "2026-09-22" }],
  });
  const precisionDe = (id: string) =>
    historial.entradas.find((entrada) => entrada.id === id)?.precision;

  it("la intervencion es de precision DIA porque su fecha es civil", () => {
    expect(precisionDe("intervencion")).toBe("DIA");
  });

  it.each([
    { id: "reporte" },
    { id: "renombre" },
    { id: "reparenteo" },
    { id: "ubicacion" },
  ])("$id es de precision MOMENTO porque tiene un instante real", ({ id }) => {
    expect(precisionDe(id)).toBe("MOMENTO");
  });

  it("conserva el orden por instante, naturaleza e id", () => {
    expect(historial.entradas.map((entrada) => entrada.id)).toEqual([
      "reporte",
      "intervencion",
      "renombre",
      "reparenteo",
      "ubicacion",
    ]);
  });
});
