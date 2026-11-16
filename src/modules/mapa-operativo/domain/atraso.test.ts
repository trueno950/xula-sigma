import { describe, expect, it } from "vitest";
import { diasDeAtrasoEnElMapa } from "./atraso";

const caso = (parcial: {
  estado?: string;
  fechaDeRegistro?: string;
  hoy?: string;
  umbral?: number;
}) => ({
  estado: parcial.estado ?? "RECIBIDO",
  fechaDeRegistro: parcial.fechaDeRegistro ?? "2026-11-01",
  hoy: parcial.hoy ?? "2026-11-08",
  umbral: parcial.umbral ?? 7,
});

describe("diasDeAtrasoEnElMapa", () => {
  it("exactamente N dias ya esta atrasado y dice cuantos lleva", () => {
    expect(diasDeAtrasoEnElMapa(caso({}))).toBe(7);
  });

  it("N-1 dias todavia no", () => {
    expect(
      diasDeAtrasoEnElMapa(caso({ fechaDeRegistro: "2026-11-02" })),
    ).toBeNull();
  });

  it.each(["EN_ATENCION", "RESUELTO", "RECHAZADO"] as const)(
    "un reporte %s no se marca en el mapa",
    (estado) => {
      expect(
        diasDeAtrasoEnElMapa(
          caso({ estado, fechaDeRegistro: "2026-01-01", hoy: "2026-11-08" }),
        ),
      ).toBeNull();
    },
  );

  it("el umbral del municipio manda: con 2 dias, uno de ayer ya esta atrasado", () => {
    expect(
      diasDeAtrasoEnElMapa(caso({ fechaDeRegistro: "2026-11-07", umbral: 2 })),
    ).toBeNull();
    expect(
      diasDeAtrasoEnElMapa(caso({ fechaDeRegistro: "2026-11-06", umbral: 2 })),
    ).toBe(2);
  });

  it("una fecha ilegible no inventa un atraso", () => {
    expect(diasDeAtrasoEnElMapa(caso({ fechaDeRegistro: "ayer" }))).toBeNull();
  });
});
