import { describe, expect, it } from "vitest";
import {
  ESTADOS_DE_INTERVENCION,
  esTerminal,
  TIPOS_DE_INTERVENCION,
  transicionValida,
} from ".";

describe("contrato de intervenciones", () => {
  it("expone los tipos y estados cerrados del dominio", () => {
    expect(TIPOS_DE_INTERVENCION).toEqual([
      "OBRA",
      "REPAVIMENTACION",
      "MEJORA",
      "FUGA",
      "ALUMBRADO",
      "BACHE",
      "MANTENIMIENTO",
    ]);
    expect(ESTADOS_DE_INTERVENCION).toEqual([
      "PLANIFICADA",
      "EN_EJECUCION",
      "FINALIZADA",
      "CANCELADA",
    ]);
  });

  it.each([
    ["PLANIFICADA", "EN_EJECUCION"],
    ["PLANIFICADA", "CANCELADA"],
    ["EN_EJECUCION", "FINALIZADA"],
    ["EN_EJECUCION", "CANCELADA"],
  ] as const)("acepta %s -> %s", (desde, hacia) => {
    expect(transicionValida(desde, hacia)).toBe(true);
  });

  it.each([
    ["PLANIFICADA", "FINALIZADA"],
    ["EN_EJECUCION", "PLANIFICADA"],
    ["FINALIZADA", "PLANIFICADA"],
    ["CANCELADA", "EN_EJECUCION"],
  ] as const)("rechaza %s -> %s", (desde, hacia) => {
    expect(transicionValida(desde, hacia)).toBe(false);
  });

  it.each(["FINALIZADA", "CANCELADA"] as const)(
    "%s es terminal y no tiene transiciones",
    (estado) => {
      expect(esTerminal(estado)).toBe(true);
    },
  );
});
