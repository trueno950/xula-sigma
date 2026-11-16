import { describe, expect, it } from "vitest";
import { COLOR_DE_ESTADO_DESCONOCIDO, colorDeEstado } from "../domain";
import {
  ESTADOS_DE_INTERVENCION_PARA_FILTRO,
  ESTADOS_DE_REPORTE_PARA_FILTRO,
} from "../domain/vocabularios";

const HEX = /^#[0-9a-f]{6}$/;

const coloresDe = (estados: readonly string[]) =>
  estados.map((estado) => colorDeEstado(estado));

describe("colorDeEstado", () => {
  it.each([
    ["reportes", ESTADOS_DE_REPORTE_PARA_FILTRO],
    ["intervenciones", ESTADOS_DE_INTERVENCION_PARA_FILTRO],
  ])("cada estado de %s tiene su color", (_nombre, estados) => {
    for (const color of coloresDe(estados)) {
      expect(color).toMatch(HEX);
    }
  });

  it("dos estados del mismo recurso nunca comparten color", () => {
    for (const estados of [
      ESTADOS_DE_REPORTE_PARA_FILTRO,
      ESTADOS_DE_INTERVENCION_PARA_FILTRO,
    ]) {
      expect(new Set(coloresDe(estados)).size).toBe(estados.length);
    }
  });

  it("un estado que el mapa no conoce cae a un gris neutro, no a un color de otro", () => {
    const color = colorDeEstado("INVENTADO");

    expect(color).toBe(COLOR_DE_ESTADO_DESCONOCIDO);
    expect(color).toMatch(HEX);
    expect(coloresDe(ESTADOS_DE_REPORTE_PARA_FILTRO)).not.toContain(color);
    expect(coloresDe(ESTADOS_DE_INTERVENCION_PARA_FILTRO)).not.toContain(color);
  });
});
