import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hoyEnMerida } from "./fecha";

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
