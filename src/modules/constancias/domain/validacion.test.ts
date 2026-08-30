import { describe, expect, it } from "vitest";
import { NO_VALIDO, proyectarValidacion } from "./validacion";

/**
 * El test fija la uniformidad comparando **identidad, no forma**: `toBe`,
 * no `toEqual` (design.md seccion 8). Un literal copiado pasaria `toEqual`
 * y falla `toBe` — es la reja que atrapa exactamente el defecto que la
 * propiedad existe para evitar.
 */

const FILA_VIGENTE = {
  tipo: "VECINDAD" as const,
  emitidaEn: "2026-01-15T10:00:00.000Z",
  canceladaEn: null,
  codigoVerificacion: "a1b2c3d4e5f60718",
  titular: "Juan Poot",
  direccion: "Calle 10, Motul",
};

describe("proyectarValidacion", () => {
  it("fila null da NO_VALIDO", () => {
    expect(proyectarValidacion(null, null)).toBe(NO_VALIDO);
  });

  it("fila cancelada da NO_VALIDO, la misma referencia", () => {
    const cancelada = {
      ...FILA_VIGENTE,
      canceladaEn: "2026-02-01T00:00:00.000Z",
    };

    expect(proyectarValidacion(cancelada, null)).toBe(NO_VALIDO);
  });

  it("sin codigo, fila vigente da nivel 1: solo estado, tipo y emitidaEn", () => {
    const resultado = proyectarValidacion(FILA_VIGENTE, null);

    expect(resultado).toEqual({
      estado: "VIGENTE",
      tipo: "VECINDAD",
      emitidaEn: FILA_VIGENTE.emitidaEn,
    });
    expect(resultado).not.toHaveProperty("titular");
    expect(resultado).not.toHaveProperty("direccion");
  });

  it("codigo incorrecto da NO_VALIDO", () => {
    expect(proyectarValidacion(FILA_VIGENTE, "codigo-equivocado")).toBe(
      NO_VALIDO,
    );
  });

  it("codigo correcto da nivel 2 con titular y direccion", () => {
    const resultado = proyectarValidacion(
      FILA_VIGENTE,
      FILA_VIGENTE.codigoVerificacion,
    );

    expect(resultado).toEqual({
      estado: "VIGENTE",
      tipo: "VECINDAD",
      emitidaEn: FILA_VIGENTE.emitidaEn,
      titular: FILA_VIGENTE.titular,
      direccion: FILA_VIGENTE.direccion,
    });
  });
});
