import { describe, expect, it } from "vitest";
import {
  diasDeAtraso,
  esUmbralDeAtraso,
  fechaDeCorte,
  UMBRAL_DE_ATRASO_MAXIMO,
  UMBRAL_DE_ATRASO_MINIMO,
  UMBRAL_DE_ATRASO_POR_DEFECTO,
} from "./umbralDeAtraso";

/**
 * Las fronteras de S1 de `gestion-municipal`, como sondeo durable: el dia de
 * corte, el borde inclusivo del umbral y el registro de las 23:30 en Merida.
 * `umbralDeAtraso.test.ts` prueba los casos; este archivo fija las fronteras
 * que el verificador independiente comprobo a mano, para que la proxima
 * rebanada no las mueva sin que algo falle.
 *
 * El dominio no importa `shared` (`dependency-cruiser`: `dominio-no-importa-
 * nada`), asi que el dia civil del instante se resuelve aca con la misma zona
 * y el mismo locale que `shared/lib/fecha`. Que el convertidor canonico
 * coincida con esta lectura lo fija `application/fechaCivil.test.ts` sobre
 * este mismo instante: si alguno de los dos se corre, falla uno de los dos.
 */
const formateador = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Merida",
});

const HOY = "2026-11-23";

const reporte = (parcial: {
  fechaDeRegistro?: string;
  hoy?: string;
  umbral?: number;
}) => ({
  estado: "RECIBIDO" as const,
  fechaDeRegistro: parcial.fechaDeRegistro ?? "2026-11-16",
  hoy: parcial.hoy ?? HOY,
  umbral: parcial.umbral ?? UMBRAL_DE_ATRASO_POR_DEFECTO,
});

describe("diasDeAtraso: el borde del umbral", () => {
  it("exactamente N dias ya esta atrasado, y N-1 todavia no", () => {
    expect(diasDeAtraso(reporte({}))).toBe(7);
    expect(diasDeAtraso(reporte({ fechaDeRegistro: "2026-11-17" }))).toBeNull();
  });
});

describe("fechaDeCorte: la misma frontera que la regla", () => {
  it.each([
    UMBRAL_DE_ATRASO_MINIMO,
    UMBRAL_DE_ATRASO_POR_DEFECTO,
    UMBRAL_DE_ATRASO_MAXIMO,
  ])(
    "con umbral %i, el dia de corte esta atrasado y el siguiente no",
    (umbral) => {
      const corte = fechaDeCorte(HOY, umbral);
      // El dia siguiente al corte es, por definicion, el corte de umbral - 1.
      const siguiente = fechaDeCorte(HOY, umbral - 1);

      expect(
        diasDeAtraso({
          estado: "RECIBIDO",
          fechaDeRegistro: corte,
          hoy: HOY,
          umbral,
        }),
      ).toBe(umbral);
      expect(
        diasDeAtraso({
          estado: "RECIBIDO",
          fechaDeRegistro: siguiente,
          hoy: HOY,
          umbral,
        }),
      ).toBeNull();
    },
  );
});

describe("diasDeAtraso: la medianoche de Merida", () => {
  it("un registro de las 23:30 del 16 cuenta desde el dia 16, no desde el 17", () => {
    // 2026-11-17T05:30Z son las 23:30 del 16 en Merida (UTC-6).
    const diaCivil = formateador.format(new Date("2026-11-17T05:30:00Z"));

    expect(diaCivil).toBe("2026-11-16");
    expect(diasDeAtraso(reporte({ fechaDeRegistro: diaCivil }))).toBe(7);
    expect(
      diasDeAtraso(reporte({ fechaDeRegistro: diaCivil, hoy: "2026-11-22" })),
    ).toBeNull();
  });
});

describe("esUmbralDeAtraso: el rango cerrado", () => {
  it.each([
    [0, false],
    [91, false],
    [1.5, false],
    [Number.NaN, false],
    [UMBRAL_DE_ATRASO_MINIMO, true],
    [UMBRAL_DE_ATRASO_MAXIMO, true],
  ])("el umbral %s da %s", (valor, esperado) => {
    expect(esUmbralDeAtraso(valor)).toBe(esperado);
  });
});
