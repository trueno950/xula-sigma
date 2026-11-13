import { describe, expect, it } from "vitest";
import { fechaYHoraIsoEnMerida } from "./fecha";

/**
 * El formato que pide S3 de `exportacion-de-datos`: `2026-11-13 18:05`, la
 * fecha civil y la hora de Merida, sin locale. Excel lo ordena como fecha al
 * abrirlo y no confunde dia con mes, que es lo que pasa con `13/11/2026` en
 * una instalacion en ingles.
 *
 * Vive aparte de `fecha.test.ts` porque ese archivo ya pasa de 190 lineas y
 * la metrica de archivo es de 200: el tema es el mismo, el archivo no.
 */
describe("fechaYHoraIsoEnMerida", () => {
  it("un instante de las 00:05 UTC es las 18:05 del dia anterior en Merida", () => {
    expect(fechaYHoraIsoEnMerida(new Date("2026-11-14T00:05:00.000Z"))).toBe(
      "2026-11-13 18:05",
    );
  });

  it("las 02:05 UTC siguen siendo el dia anterior en Merida", () => {
    expect(fechaYHoraIsoEnMerida(new Date("2026-11-14T02:05:00.000Z"))).toBe(
      "2026-11-13 20:05",
    );
  });

  it("las 06:00 UTC ya son el mismo dia en Merida, y sin el 24 de medianoche", () => {
    expect(fechaYHoraIsoEnMerida(new Date("2026-11-14T06:00:00.000Z"))).toBe(
      "2026-11-14 00:00",
    );
  });

  it("rellena con cero el mes, el dia, la hora y el minuto", () => {
    expect(fechaYHoraIsoEnMerida(new Date("2026-01-02T14:03:00.000Z"))).toBe(
      "2026-01-02 08:03",
    );
  });
});
