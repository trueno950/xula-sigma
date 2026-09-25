import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  anioEnMerida,
  fechaCivilDeMedianocheUtc,
  fechaEnMerida,
  fechaYHoraEnMerida,
  hoyEnMerida,
} from "./fecha";

/**
 * Bug que este archivo existe para atajar (design.md de `capa-territorial`
 * seccion 8): la medianoche UTC del 3 de marzo es todavia 2 de marzo en
 * `America/Merida` (UTC-6, sin horario de verano). Guardar una fecha civil
 * con `new Date().toISOString().slice(0, 10)` cae un dia atras para
 * cualquier hora entre las 18:00 y las 23:59 en Merida.
 */
describe("hoyEnMerida", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("medianoche UTC del 3 de marzo es 2 de marzo en Merida", () => {
    vi.setSystemTime(new Date("2019-03-03T00:00:00.000Z"));

    expect(hoyEnMerida()).toBe("2019-03-02");
  });

  it("las 06:00 UTC del 3 de marzo ya son 3 de marzo en Merida", () => {
    vi.setSystemTime(new Date("2019-03-03T06:00:00.000Z"));

    expect(hoyEnMerida()).toBe("2019-03-03");
  });

  it("devuelve el formato YYYY-MM-DD", () => {
    vi.setSystemTime(new Date("2019-03-03T18:30:00.000Z"));

    expect(hoyEnMerida()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

/**
 * Mismo bug que `hoyEnMerida`, un nivel mas arriba: el contador de folios
 * (tasks.md Fase 4, 4.1) resuelve el anio de la serie con esta funcion, y no
 * con `new Date().getUTCFullYear()`.
 */
describe("anioEnMerida", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("las 19:00 hora de Merida del 31 de diciembre ya son 1 de enero en UTC, pero el anio sigue siendo el anterior", () => {
    // 19:00 en America/Merida (UTC-6) del 31 de diciembre de 2025 es
    // 01:00 UTC del 1 de enero de 2026.
    vi.setSystemTime(new Date("2026-01-01T01:00:00.000Z"));

    expect(anioEnMerida()).toBe(2025);
  });

  it("las 08:00 UTC del 1 de enero ya son 1 de enero en Merida", () => {
    vi.setSystemTime(new Date("2026-01-01T08:00:00.000Z"));

    expect(anioEnMerida()).toBe(2026);
  });

  it("devuelve un numero, no un texto", () => {
    vi.setSystemTime(new Date("2019-03-03T18:30:00.000Z"));

    expect(anioEnMerida()).toBe(2019);
  });
});

/**
 * Mismo bug otra vez, esta vez formateando una fecha ya guardada -no "ahora"-
 * para mostrarla en pantalla (GGA en la revision de constancias 4b:
 * `toLocaleString`/`toLocaleDateString` sin `timeZone` usan la del proceso,
 * UTC en el servidor, no la de Merida).
 */
describe("fechaYHoraEnMerida", () => {
  it("las 19:00 hora de Merida del 31 de diciembre no se muestran como 1 de enero", () => {
    // 19:00 en America/Merida (UTC-6) del 31 de diciembre de 2025 es
    // 01:00 UTC del 1 de enero de 2026.
    const emitida = new Date("2026-01-01T01:00:00.000Z");

    expect(fechaYHoraEnMerida(emitida)).toContain("31 dic");
    expect(fechaYHoraEnMerida(emitida)).not.toContain("1 ene");
  });
});

describe("fechaCivilDeMedianocheUtc", () => {
  it("una fecha civil guardada como medianoche UTC se muestra como ese mismo dia, no el anterior", () => {
    // La medianoche UTC del 22 de septiembre es las 18:00 del 21 en Merida:
    // formatearla con `fechaEnMerida` mostraria el dia equivocado.
    const fechaCivil = new Date("2026-09-22T00:00:00.000Z");

    expect(fechaCivilDeMedianocheUtc(fechaCivil)).toContain("22 sep");
    expect(fechaEnMerida(fechaCivil)).toContain("21 sep");
  });

  it("no agrega hora alguna", () => {
    const texto = fechaCivilDeMedianocheUtc(
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(texto).toContain("1 ene 2026");
    expect(texto).not.toMatch(/\d:\d\d/);
  });
});

describe("fechaEnMerida", () => {
  it("las 19:00 hora de Merida del 31 de diciembre no se muestran como 1 de enero", () => {
    const emitida = new Date("2026-01-01T01:00:00.000Z");

    expect(fechaEnMerida(emitida)).toContain("31 dic");
    expect(fechaEnMerida(emitida)).not.toContain("1 ene");
  });
});
