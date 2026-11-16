import { describe, expect, it } from "vitest";
import {
  diasDeAtraso,
  esUmbralDeAtraso,
  fechaDeCorte,
  UMBRAL_DE_ATRASO_MAXIMO,
  UMBRAL_DE_ATRASO_MINIMO,
  UMBRAL_DE_ATRASO_POR_DEFECTO,
} from "./umbralDeAtraso";

const reporte = (parcial: {
  estado?: "RECIBIDO" | "EN_ATENCION" | "RESUELTO" | "RECHAZADO";
  fechaDeRegistro?: string;
  hoy?: string;
  umbral?: number;
}) => ({
  estado: parcial.estado ?? "RECIBIDO",
  fechaDeRegistro: parcial.fechaDeRegistro ?? "2026-11-01",
  hoy: parcial.hoy ?? "2026-11-08",
  umbral: parcial.umbral ?? UMBRAL_DE_ATRASO_POR_DEFECTO,
});

describe("diasDeAtraso", () => {
  it("el valor por defecto es el recomendado de una semana", () => {
    expect(UMBRAL_DE_ATRASO_POR_DEFECTO).toBe(7);
  });

  it("exactamente N dias ya esta atrasado, y dice cuantos dias lleva", () => {
    expect(diasDeAtraso(reporte({}))).toBe(7);
  });

  it("N-1 dias todavia no esta atrasado", () => {
    expect(diasDeAtraso(reporte({ fechaDeRegistro: "2026-11-02" }))).toBeNull();
  });

  it("un dia mas de N sigue contando los dias reales, no el umbral", () => {
    expect(diasDeAtraso(reporte({ fechaDeRegistro: "2026-10-29" }))).toBe(10);
  });

  it.each(["EN_ATENCION", "RESUELTO", "RECHAZADO"] as const)(
    "un reporte %s no cuenta como atrasado aunque tenga meses",
    (estado) => {
      expect(
        diasDeAtraso(
          reporte({ estado, fechaDeRegistro: "2026-01-01", hoy: "2026-11-08" }),
        ),
      ).toBeNull();
    },
  );

  it("el umbral lo fija el municipio: con 5 dias, uno de 4 todavia no", () => {
    expect(
      diasDeAtraso(reporte({ fechaDeRegistro: "2026-11-03", umbral: 5 })),
    ).toBe(5);
    expect(
      diasDeAtraso(reporte({ fechaDeRegistro: "2026-11-04", umbral: 5 })),
    ).toBeNull();
  });

  it("con el maximo de 90 dias un reporte de 89 no esta atrasado", () => {
    expect(
      diasDeAtraso(
        reporte({
          fechaDeRegistro: "2026-08-11",
          hoy: "2026-11-08",
          umbral: UMBRAL_DE_ATRASO_MAXIMO,
        }),
      ),
    ).toBeNull();
    expect(
      diasDeAtraso(
        reporte({
          fechaDeRegistro: "2026-08-10",
          hoy: "2026-11-08",
          umbral: UMBRAL_DE_ATRASO_MAXIMO,
        }),
      ),
    ).toBe(90);
  });

  it("una fecha de registro futura no es atraso", () => {
    expect(diasDeAtraso(reporte({ fechaDeRegistro: "2026-11-09" }))).toBeNull();
  });

  it("una fecha ilegible no inventa un atraso", () => {
    expect(diasDeAtraso(reporte({ fechaDeRegistro: "ayer" }))).toBeNull();
  });
});

describe("esUmbralDeAtraso", () => {
  it.each([
    [UMBRAL_DE_ATRASO_MINIMO, true],
    [UMBRAL_DE_ATRASO_MAXIMO, true],
    [30, true],
    [0, false],
    [91, false],
    [7.5, false],
    [Number.NaN, false],
  ])("el entero %s: %s", (valor, esperado) => {
    expect(esUmbralDeAtraso(valor)).toBe(esperado);
  });
});

describe("fechaDeCorte", () => {
  it("es el dia civil de hoy menos el umbral", () => {
    expect(fechaDeCorte("2026-11-15", 7)).toBe("2026-11-08");
  });

  it("cruza el cambio de mes sin correrse", () => {
    expect(fechaDeCorte("2026-12-03", 7)).toBe("2026-11-26");
  });

  it("coincide con la frontera de `diasDeAtraso`: el dia de corte ya esta atrasado", () => {
    const corte = fechaDeCorte("2026-11-15", 7);

    expect(
      diasDeAtraso({
        estado: "RECIBIDO",
        fechaDeRegistro: corte,
        hoy: "2026-11-15",
        umbral: 7,
      }),
    ).toBe(7);
  });
});
