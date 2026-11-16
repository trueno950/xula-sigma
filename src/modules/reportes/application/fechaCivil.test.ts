import { describe, expect, it } from "vitest";
import { diasDeAtraso } from "../domain";
import { fechaCivilDeInstante } from "./fechaCivil";

describe("fechaCivilDeInstante", () => {
  it("la medianoche UTC de Merida es el mismo dia", () => {
    // 06:00 UTC del 17 son las 00:00 del 17 en Merida (UTC-6).
    expect(fechaCivilDeInstante(new Date("2026-11-17T06:00:00Z"))).toBe(
      "2026-11-17",
    );
  });

  it("un minuto antes de esa medianoche todavia es el dia anterior", () => {
    expect(fechaCivilDeInstante(new Date("2026-11-17T05:59:00Z"))).toBe(
      "2026-11-16",
    );
  });

  it("las 19:00 de Merida caen al dia siguiente en UTC y no corren la fecha", () => {
    // 19:00 del 31 de diciembre en Merida son la 01:00 UTC del 1 de enero.
    expect(fechaCivilDeInstante(new Date("2027-01-01T01:00:00Z"))).toBe(
      "2026-12-31",
    );
  });

  it("un reporte registrado a la medianoche de Merida cumple el umbral el dia justo", () => {
    const registradoEn = new Date("2026-11-17T06:00:00Z");

    expect(
      diasDeAtraso({
        estado: "RECIBIDO",
        fechaDeRegistro: fechaCivilDeInstante(registradoEn),
        hoy: "2026-11-24",
        umbral: 7,
      }),
    ).toBe(7);
    expect(
      diasDeAtraso({
        estado: "RECIBIDO",
        fechaDeRegistro: fechaCivilDeInstante(registradoEn),
        hoy: "2026-11-23",
        umbral: 7,
      }),
    ).toBeNull();
  });
});
